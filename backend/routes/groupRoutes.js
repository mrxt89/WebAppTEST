// src/routes/groupRoutes.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../config');
const authenticateToken = require('../authenticateToken');

// Get all groups for the current user's company
router.get('/groups', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    g.groupId,
                    g.groupName,
                    g.description
                FROM AR_Groups g
                WHERE g.disabled = 0
                AND g.CompanyId = (SELECT CompanyId FROM AR_Users WHERE userId = @UserId)
                ORDER BY g.groupName
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).send('Internal server error');
    }
});

// Get group members
router.get('/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('GroupId', sql.Int, groupId)
            .query(`
                SELECT 
                    u.userId,
                    u.firstName,
                    u.lastName,
                    u.email
                FROM AR_GroupMembers gm
                JOIN AR_Users u ON gm.userId = u.userId
                WHERE gm.groupId = @GroupId
                AND u.userDisabled = 0
                ORDER BY u.firstName, u.lastName
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching group members:', err);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;