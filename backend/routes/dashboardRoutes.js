const express = require('express');
const router = express.Router();
const {
  getAllGroups,
  getAllUsers,
  updateGroup,
  assignUserToGroup,
  removeUserFromGroup,
  addGroup,
  getAllPages,
  enableDisablePage,
  toggleInheritPermissions,
  assignGroupToPage,
  removeGroupFromPage,
  getNotificationsChannels,
  addNotificationChannel,
  updateNotificationChannel,
  addUserToChannel,
  removeUserFromChannel,
} = require('../queries/dashboardManagement');
const authenticateToken = require('../authenticateToken');

/* Gestione dei gruppi */
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const CompanyId = req.user.CompanyId;
    const groups = await getAllGroups(CompanyId);
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).send('Internal server error');
  }
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const CompanyId = req.user.CompanyId;
    const users = await getAllUsers(CompanyId);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    req.body.userId = userId;
    const result = await addGroup(req.body);
    if (result.success) {
      res.status(200).send('Group added successfully');
    } else {
      res.status(400).send(result.message);
    }
  } catch (err) {
    console.error('Error adding group:', err);
    res.status(500).send('Internal server error');
  }
});

router.put('/groups/:id', authenticateToken, async (req, res) => {
  try {
    await updateGroup(req.params.id, req.body);
    res.status(200).send(true);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/groups/:id/add-user', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const groupId = req.params.id;
  try {
    await assignUserToGroup(userId, groupId);
    res.send('User assigned to group successfully');
  } catch (err) {
    console.error('Error assigning user to group:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/groups/:id/remove-user', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const groupId = req.params.id;
  try {
    await removeUserFromGroup(userId, groupId);
    res.send('User removed from group successfully');
  } catch (err) {
    console.error('Error removing user from group:', err);
    res.status(500).send('Internal server error');
  }
});

/* Gestione delle pagine */
router.get('/pages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const pages = await getAllPages(userId);
    res.json(pages);
  } catch (err) {
    console.error('Error fetching pages:', err);
    res.status(500).send('Internal server error');
  }
});

router.put('/pages/:id/status', authenticateToken, async (req, res) => {
  const { disabled } = req.body;
  try {
    await enableDisablePage(req.params.id, disabled);
    res.status(200).send('Page status updated successfully');
  } catch (err) {
    console.error('Error updating page status:', err);
    res.status(500).send('Internal server error');
  }
});

// Nuova route per attivare/disattivare l'ereditarietà dei permessi
router.put('/pages/:id/inheritance', authenticateToken, async (req, res) => {
  const { inheritPermissions } = req.body;
  try {
    await toggleInheritPermissions(req.params.id, inheritPermissions);
    res.status(200).send('Page inheritance updated successfully');
  } catch (err) {
    console.error('Error updating page inheritance:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/pages/:id/add-group', authenticateToken, async (req, res) => {
  const { groupId, applyToChildren = false } = req.body;
  try {
    await assignGroupToPage(req.params.id, groupId, applyToChildren);
    res.status(200).send('Group assigned to page successfully');
  } catch (err) {
    console.error('Error assigning group to page:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/pages/:id/remove-group', authenticateToken, async (req, res) => {
  const { groupId, applyToChildren = false } = req.body;
  try {
    await removeGroupFromPage(req.params.id, groupId, applyToChildren);
    res.status(200).send('Group removed from page successfully');
  } catch (err) {
    console.error('Error removing group from page:', err);
    res.status(500).send('Internal server error');
  }
});

/* Gestione canali delle notifiche */
router.get('/notifications-channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const channels = await getNotificationsChannels(userId);
    res.json(channels);
  } catch (err) {
    console.error('Error fetching notifications channels:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/notifications-channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const result = await addNotificationChannel(req.body, userId);
    if (result.success) {
      res.status(200).send('Channel added successfully');
    } else {
      res.status(400).send(result.message);
    }
  } catch (err) {
    console.error('Error adding notification channel:', err);
    res.status(500).send('Internal server error');
  }
});

router.put('/notifications-channels/:id', authenticateToken, async (req, res) => {
  try {
    await updateNotificationChannel(req.body);
    res.status(200).send('Channel updated successfully');
  } catch (err) {
    console.error('Error updating notification channel:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/notifications-channels/:id/add-user', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const notificationCategoryId = req.params.id;
  try {
    await addUserToChannel(userId, notificationCategoryId);
    res.send('User added to channel successfully');
  } catch (err) {
    console.error('Error adding user to channel:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/notifications-channels/:id/remove-user', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const notificationCategoryId = req.params.id;
  try {
    await removeUserFromChannel(userId, notificationCategoryId);
    res.send('User removed from channel successfully');
  } catch (err) {
    console.error('Error removing user from channel:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;