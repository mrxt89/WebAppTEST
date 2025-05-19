// Hook personalizzato migliorato per gestire le sequenze dei task
import { useState, useCallback, useEffect } from "react";

const useTaskSequence = (initialTasks, updateTaskSequence, getProjectById) => {
  // Riordina sempre i task per sequenza quando li ricevi
  const [orderedTasks, setOrderedTasks] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Inizializza e aggiorna i task ordinati quando cambia initialTasks
  useEffect(() => {
    if (!initialTasks || initialTasks.length === 0) {
      setOrderedTasks([]);
      return;
    }

    const sortedTasks = [...initialTasks].sort(
      (a, b) => a.TaskSequence - b.TaskSequence,
    );
    setOrderedTasks(sortedTasks);
  }, [initialTasks]);

  // Funzione per aggiornare l'ordine visivo durante il trascinamento
  const moveTask = useCallback(
    (dragIndex, hoverIndex) => {
      if (isUpdating) return; // Evita modifiche durante l'aggiornamento del server

      setOrderedTasks((prevTasks) => {
        const newTasks = [...prevTasks];
        const [removed] = newTasks.splice(dragIndex, 1);
        newTasks.splice(hoverIndex, 0, removed);

        return newTasks;
      });
    },
    [isUpdating],
  );

  // Funzione per aggiornare la sequenza sul server
  const handleTaskSequenceUpdate = useCallback(
    async (taskId, projectId, dropIndex) => {
      try {
        setIsUpdating(true);

        // Calcoliamo la nuova sequenza - usiamo i multipli di 10 per mantenere spazio
        const newSequence = (dropIndex + 1) * 10;

        // Chiamata all'API per aggiornare la sequenza
        const result = await updateTaskSequence(taskId, projectId, newSequence);

        if (result && result.success) {
          // Forza un refresh completo del progetto dopo un breve ritardo
          // per assicurarsi che il database abbia completato l'aggiornamento
          setLastUpdateTime(Date.now());

          try {
            const refreshedProject = await getProjectById(parseInt(projectId));

            if (refreshedProject && refreshedProject.tasks) {
              // Ordina i task per sequenza
              const refreshedSortedTasks = [...refreshedProject.tasks].sort(
                (a, b) => a.TaskSequence - b.TaskSequence,
              );

              // Aggiorna i task ordinati localmente
              setOrderedTasks(refreshedSortedTasks);
            }
          } catch (refreshError) {
            console.error(
              "useTaskSequence: Errore nell'aggiornamento del progetto:",
              refreshError,
            );
          }
        }

        return result || { success: false };
      } catch (error) {
        console.error(
          "useTaskSequence: Errore nell'aggiornamento della sequenza:",
          error,
        );
        throw error;
      } finally {
        // Ritardo nell'impostazione di isUpdating a false per evitare aggiornamenti rapidi
        setTimeout(() => {
          setIsUpdating(false);
        }, 300);
      }
    },
    [updateTaskSequence, getProjectById],
  );

  // Aggiorna i task quando cambiano dall'esterno
  const updateTasks = useCallback(
    (newTasks) => {
      if (!isUpdating && newTasks && newTasks.length > 0) {
        const sortedNewTasks = [...newTasks].sort(
          (a, b) => a.TaskSequence - b.TaskSequence,
        );
        setOrderedTasks(sortedNewTasks);
      }
    },
    [isUpdating],
  );

  return {
    orderedTasks,
    moveTask,
    handleTaskSequenceUpdate,
    isUpdating,
    updateTasks,
    lastUpdateTime,
  };
};

export default useTaskSequence;
