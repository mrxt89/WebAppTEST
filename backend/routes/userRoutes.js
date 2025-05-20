const express = require('express');
const router = express.Router();
const {
  getUserById,
  getAllUsers,
  changePassword,
  updateUser,
  addUser,
  resetPassword,
  toggleUserStatus,
  getUserCompanies,
  getAllCompanies,
  assignUserToCompany,
  removeUserFromCompany,
  updateUserPrimaryCompany, 
  getUserCompaniesByUsername
} = require('../queries/userManagement');
const authenticateToken = require('../authenticateToken');

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const users = await getAllUsers(userId);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.UserId;
  try {
    const result = await changePassword(userId, currentPassword, newPassword);
    res.status(result ? 200 : 400).send(result);
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/reset-password', authenticateToken, async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    const result = await resetPassword(userId, newPassword);
    res.status(result ? 200 : 400).send(result);
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).send('Internal server error');
  }
});

router.put('/user/:id', authenticateToken, async (req, res) => {
  try {
    await updateUser(req.body);
    res.status(200).send(true);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).send('Internal server error');
  }
});

router.put('/user/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userDisabled } = req.body;
  try {
    const result = await toggleUserStatus(id, userDisabled);
    res.status(200).send(result);
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/add-user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId
    // aggiunge a req.body l'userId dell'utente che ha effettuato la richiesta
    req.body.userId = userId;
    const result = await addUser(req.body);
    if (result.success) {
      res.status(200).send('User added successfully');
    } else {
      res.status(400).send(result.message);
    }
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).send('Internal server error');
  }
});



router.get('/user-companies/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const companies = await getUserCompanies(username);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching user companies:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per ottenere tutte le aziende
router.get('/companies', authenticateToken, async (req, res) => {
  try {
    const companies = await getAllCompanies();
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per ottenere le aziende di un utente
router.get('/user-companies/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const companies = await getUserCompanies(userId);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching user companies:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per assegnare un utente a un'azienda
router.post('/user/:userId/assign-company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    await assignUserToCompany(userId, companyId);
    res.status(200).send('User assigned to company successfully');
  } catch (err) {
    console.error('Error assigning user to company:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per rimuovere un utente da un'azienda
router.post('/user/:userId/remove-company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    const result = await removeUserFromCompany(userId, companyId);
    
    if (result.success) {
      res.status(200).send('User removed from company successfully');
    } else {
      res.status(400).send(result.message);
    }
  } catch (err) {
    console.error('Error removing user from company:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per impostare l'azienda primaria di un utente
router.post('/user/:userId/set-primary-company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    const result = await updateUserPrimaryCompany(userId, companyId);
    
    if (result.success) {
      res.status(200).send('User primary company updated successfully');
    } else {
      res.status(400).send(result.message);
    }
  } catch (err) {
    console.error('Error updating user primary company:', err);
    res.status(500).send('Internal server error');
  }
});

// Endpoint per ottenere le aziende di un utente tramite username
router.get('/user-companies-by-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const companies = await getUserCompaniesByUsername(username);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching user companies by username:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
