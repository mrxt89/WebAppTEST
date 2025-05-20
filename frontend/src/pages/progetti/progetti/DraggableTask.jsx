import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { cn } from "@/lib/utils";

/**
 * DraggableTask component used for handling drag and drop operations on task items
 * @param {Object} task - The task object containing task details
 * @param {number} index - The current index position of this task
 * @param {Function} moveTask - Function to handle reordering during drag
 * @param {Function} onTaskSequenceUpdate - Function to save sequence changes to backend
 * @param {Function} renderTask - Render function for task content
 * @param {boolean} isDraggingEnabled - Whether dragging is enabled for this task
 * @param {number} totalTasks - Total number of tasks in the list
 */
const DraggableTask = ({
  task,
  index,
  moveTask,
  onTaskSequenceUpdate,
  renderTask,
  isDraggingEnabled = true,
  totalTasks,
}) => {
  const ref = useRef(null);
  const initialPosition = useRef(null);
  const [dragDelay, setDragDelay] = useState(false);
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [visualFeedback, setVisualFeedback] = useState(false);

  // Visual feedback timer
  useEffect(() => {
    if (visualFeedback) {
      const timer = setTimeout(() => {
        setVisualFeedback(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visualFeedback]);

  const [{ isDragging }, drag] = useDrag({
    type: "TASK",
    item: () => {
      // Store initial position to calculate movement
      initialPosition.current = index;
      return {
        id: task.TaskID,
        index,
        initialSequence: task.TaskSequence,
      };
    },
    canDrag: () => {
      // Only allow dragging if enabled and not in other operations
      return isDraggingEnabled && !dragDelay && !updateInProgress;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        // Handle case where drag was canceled
        return;
      }
    },
  });

  const [{ handlerId, isOver }, drop] = useDrop({
    accept: "TASK",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOver: monitor.isOver(),
      };
    },
    hover(item, monitor) {
      if (!ref.current || updateInProgress) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      // Determine mouse position relative to the center of the item
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the item's height
      // When dragging downward, only move when the cursor is below 50%
      // When dragging upward, only move when the cursor is above 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    drop(item) {
      const dropIndex = index;
      const startIndex = initialPosition.current;

      if (startIndex !== dropIndex) {
        // Lock interactions during update
        setDragDelay(true);
        setUpdateInProgress(true);
        setVisualFeedback(true);

        // Perform backend update for sequence
        onTaskSequenceUpdate(task.TaskID, task.ProjectID, dropIndex)
          .then((result) => {
            if (!result || !result.success) {
              // If there's an error, we remove the success feedback
              setVisualFeedback(false);
            }
          })
          .catch((error) => {
            console.error(
              `DraggableTask ${task.TaskID}: Sequence update error:`,
              error,
            );
            setVisualFeedback(false);
          })
          .finally(() => {
            // Add a small delay before allowing new interactions
            setTimeout(() => {
              setDragDelay(false);
              setUpdateInProgress(false);
            }, 500);
          });
      }
    },
  });

  // Connect drag and drop refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-50",
        dragDelay && "cursor-wait",
        updateInProgress && "bg-blue-50",
        visualFeedback && "bg-green-50 border-green-200",
        isOver && "border-2 border-blue-300",
      )}
      data-handler-id={handlerId}
      data-task-id={task.TaskID}
      data-task-sequence={task.TaskSequence}
      data-task-index={index}
    >
      {renderTask(task)}
    </div>
  );
};

export default DraggableTask;
