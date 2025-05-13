const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    getPaginatedProjects,
    getProjectById,
    addUpdateProject,
    updateProjectMembers,
    addUpdateProjectTask,
    updateTaskStatus,
    addTaskComment,
    addTaskAttachment,
    getUserProjectStatistics,
    manageTaskCosts,
    getTaskHistory,
    getUnitsOfMeasure,
    getCostCategories,
    updateTaskSequence,
    getUserTasks,
    updateProjectMemberRole,
    getProjectStatuses,
    getUserMemberProjects
  } = require('../queries/projectManagement');

// Ottieni tutte le unità di misura
router.get('/uom', authenticateToken, async (req, res) => {
    try {
        const uoms = await getUnitsOfMeasure();
        res.json(uoms);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni tutte le categorie di costo
router.get('/costCategories', authenticateToken, async (req, res) => {
    try {
        const categories = await getCostCategories();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Get all projects with pagination and filters
router.get('/projects/paginated', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
        const userId = req.user.UserId;

        const result = await getPaginatedProjects(page, pageSize, filters, userId);
        res.json(result);
    } catch (err) {
        console.error('Error fetching paginated projects:', err);
        res.status(500).send('Internal server error');
    }
});

// Get project details with tasks and members
router.get('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user.UserId;
        const project = await getProjectById(projectId, userId);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).send('Internal server error');
    }
});

// Create or update project
router.post('/projects', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const projectData = {
            ...req.body,
            TBCreatedId: userId
        };
        
        const result = await addUpdateProject(projectData, userId);
        res.json(result);
    } catch (err) {
        console.error('Error in project creation/update:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error creating/updating project'
        });
    }
});

// Manage project members
router.post('/projects/:id/members', authenticateToken, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const { members } = req.body;
        const userId = req.user.UserId;
        
        const result = await updateProjectMembers(projectId, userId, members);
        res.json(result);
    } catch (err) {
        console.error('Error updating project members:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error updating project members'
        });
    }
});

// Project tasks management
router.post('/projects/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const projectId = parseInt(req.params.id);
        const taskData = {
            ...req.body,
            ProjectID: projectId,        // Assicuriamoci che sia un intero
            AssignedTo: req.body.AssignedTo ? parseInt(req.body.AssignedTo) : null,  // Convertiamo in null se vuoto
            TBCreatedId: userId
        };
        
        // Validazione dei dati obbligatori
        if (!projectId) {
            return res.status(400).json({ 
                success: 0,
                msg: 'Project ID is required'
            });
        }
        
        const result = await addUpdateProjectTask(taskData, userId);
        res.json(result);
    } catch (err) {
        console.error('Error in task creation/update:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error creating/updating task'
        });
    }
});

// Update task status
router.patch('/projects/tasks/:taskId/status', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const { status } = req.body;
        const userId = req.user.UserId;
        
        const result = await updateTaskStatus(taskId, status, userId);
        res.json(result);
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error updating task status'
        });
    }
});

// Get task history
router.get('/projects/tasks/:taskId/history', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const history = await getTaskHistory(taskId);
        res.json(history);
    } catch (err) {
        console.error('Error fetching task history:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error fetching task history'
        });
    }
});

// Task comments
router.post('/projects/tasks/:taskId/comments', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const { comment } = req.body;
        const userId = req.user.UserId;
        
        const commentData = {
            TaskId: taskId,
            UserId: userId,
            Comment: comment
        };
        
        const result = await addTaskComment(commentData);
        res.json(result);
    } catch (err) {
        console.error('Error adding task comment:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error adding task comment'
        });
    }
});

// File attachments for tasks
router.post('/projects/tasks/:taskId/attachments', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const attachmentData = {
            TaskId: taskId,
            FileName: req.body.fileName,
            FilePath: req.body.filePath,
            FileType: req.body.fileType,
            FileSizeKB: req.body.fileSizeKB,
            UploadedBy: req.user.UserId
        };
        
        const result = await addTaskAttachment(attachmentData);
        res.json(result);
    } catch (err) {
        console.error('Error adding task attachment:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Error adding attachment'
        });
    }
});

// Project statistics
router.get('/projects/statistics/user', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const stats = await getUserProjectStatistics(userId);
        res.json(stats);
    } catch (err) {
        console.error('Error fetching project statistics:', err);
        res.status(500).send('Internal server error');
    }
});


router.post('/projects/tasks/:taskId/costs', authenticateToken, async (req, res) => {
    try {
        const result = await manageTaskCosts(
            'INSERT',
            parseInt(req.params.taskId),
            req.user.UserId,
            req.body
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
 });
 
 router.put('/projects/tasks/:taskId/costs/:lineId', authenticateToken, async (req, res) => {
    try {
        const result = await manageTaskCosts(
            'UPDATE',
            parseInt(req.params.taskId),
            req.user.UserId,
            req.body,
            parseInt(req.params.lineId)
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
 });
 
 router.delete('/projects/tasks/:taskId/costs/:lineId', authenticateToken, async (req, res) => {
    try {
        const result = await manageTaskCosts(
            'DELETE',
            parseInt(req.params.taskId),
            req.user.UserId,
            null,
            parseInt(req.params.lineId)
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
 });

 // Get task costs
router.get('/projects/tasks/:taskId/costs', authenticateToken, async (req, res) => {
    try {
        const result = await manageTaskCosts(
            'GET',
            parseInt(req.params.taskId),
            req.user.UserId,
            null
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

router.patch('/projects/tasks/:taskId/sequence', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const { projectId, newSequence } = req.body;
        
        // Log dettagliato per debug
        console.log('Route updateTaskSequence: Parametri ricevuti:', {
            taskId,
            projectId,
            newSequence,
            userId: req.user.UserId
        });
        
        if (!taskId || !projectId || newSequence === undefined) {
            return res.status(400).json({ 
                success: 0,
                msg: 'Parametri mancanti o non validi'
            });
        }
        
        // Chiamata alla funzione di query
        const result = await updateTaskSequence(taskId, projectId, newSequence);
        
        // Log della risposta
        console.log('Route updateTaskSequence: Risposta dalla query:', {
            success: result ? 1 : 0,
            taskId,
            projectId
        });
        
        // Risposta completa che include anche i task aggiornati
        res.json({
            success: 1,
            msg: 'Sequenza task aggiornata con successo',
            taskId,
            projectId,
            newSequence,
            // Includi i task aggiornati se disponibili
            tasks: result && Array.isArray(result) ? result : []
        });
    } catch (err) {
        console.error('Errore aggiornamento sequenza task:', err);
        res.status(500).json({ 
            success: 0,
            msg: 'Errore aggiornamento sequenza task',
            error: err.message 
        });
    }
});

// Ottieni tutte le attività assegnate all'utente corrente
router.get('/projects/tasks/user', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.UserId;
        const tasks = await getUserTasks(userId);
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching user tasks:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
}
);

// Update project member role
router.patch('/projects/:projectId/members/:memberId/role', authenticateToken, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;
      const userId = req.user.UserId;
      
      // Validazione
      if (!projectId || !memberId || !role) {
        return res.status(400).json({ 
          success: 0,
          msg: 'Parametri mancanti o non validi'
        });
      }
      
      // Verifica che il ruolo sia valido
      if (!['ADMIN', 'MANAGER', 'USER'].includes(role)) {
        return res.status(400).json({ 
          success: 0,
          msg: 'Ruolo non valido'
        });
      }
      
      // Verifica che l'utente abbia i permessi
      const project = await getProjectById(projectId, userId);
      if (!project) {
        return res.status(404).json({ 
          success: 0, 
          msg: 'Progetto non trovato'
        });
      }
      
      // Controlla che l'utente corrente sia un admin del progetto
      const currentUserMember = project.members.find(m => m.UserID === userId);
      if (!currentUserMember || currentUserMember.Role !== 'ADMIN') {
        return res.status(403).json({ 
          success: 0, 
          msg: 'Permessi insufficienti'
        });
      }
      
      // Controlla che il membro esista
      const targetMember = project.members.find(m => m.ProjectMemberID === memberId);
      if (!targetMember) {
        return res.status(404).json({ 
          success: 0, 
          msg: 'Membro del progetto non trovato'
        });
      }
      
      // Un utente non può cambiare il proprio ruolo
      if (targetMember.UserID === userId) {
        return res.status(403).json({ 
          success: 0, 
          msg: 'Non puoi modificare il tuo ruolo'
        });
      }
      
      // Esegui l'aggiornamento del ruolo
      const result = await updateProjectMemberRole(memberId, role, userId);
      res.json(result);
    } catch (err) {
      console.error('Error updating member role:', err);
      res.status(500).json({ 
        success: 0,
        msg: 'Errore nell\'aggiornamento del ruolo'
      });
    }
  });

// Get project statuses
router.get('/projectsStatuses', authenticateToken, async (req, res) => {
    try {
        const statuses = await getProjectStatuses();
        res.json(statuses);
    } catch (err) {
        console.error('Error fetching project statuses:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni progetti in cui l'utente è membro
router.get('/projects/user/member', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const projects = await getUserMemberProjects(userId);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching user member projects:', err);
    res.status(500).json({ 
      success: 0, 
      msg: 'Error fetching user member projects' 
    });
  }
});

  

module.exports = router;