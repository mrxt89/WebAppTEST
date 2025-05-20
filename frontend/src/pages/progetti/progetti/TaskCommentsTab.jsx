import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import EmojiPicker from "../../../components/chat/Emoji-picker";

const TaskCommentsTab = ({ task, onAddComment }) => {
  const [newComment, setNewComment] = useState("");
  const [parsedComments, setParsedComments] = useState([]);

  useEffect(() => {
    if (task?.Comments) {
      try {
        const comments =
          typeof task.Comments === "string"
            ? JSON.parse(task.Comments)
            : task.Comments;
        setParsedComments(comments);
      } catch (error) {
        console.error("Error parsing comments:", error);
        setParsedComments([]);
      }
    } else {
      setParsedComments([]);
    }
  }, [task]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.TaskID) return;
    try {
      const result = await onAddComment(task.TaskID, newComment);
      if (result?.success) {
        setNewComment("");
        if (result?.Comments) {
          const comments =
            typeof result.Comments === "string"
              ? JSON.parse(result.Comments)
              : result.Comments;
          setParsedComments(comments);
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4">
          {parsedComments
            .slice()
            .reverse()
            .map((comment, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {`${comment.firstName} ${comment.lastName}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.CommentDate).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 p-2 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {comment.CommentMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>

      {/* Comment Input */}
      <div className="pt-4 mt-4 border-t">
        <div className="flex gap-2 items-start">
          <div className="relative flex-1">
            <Textarea
              placeholder="Aggiungi un commento..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="pr-10 text-sm"
              rows={2}
            />
            <div className="absolute bottom-2 right-2">
              <EmojiPicker
                onChange={(emoji) => setNewComment((prev) => prev + emoji)}
              />
            </div>
          </div>
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            size="icon"
            className="mt-1"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCommentsTab;
