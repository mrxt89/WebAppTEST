const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../config');
const authenticateToken = require('../authenticateToken');

// Get company by ID
router.get('/company/:id', authenticateToken, async (req, res) => {
  const companyId = req.params.id;
  
  try {
    // Check if user belongs to requested company
    const userCompanyId = req.user.CompanyId;
    
    // Only allow access to the user's own company
    if (userCompanyId && parseInt(companyId) !== parseInt(userCompanyId)) {
      return res.status(403).json({ message: 'Unauthorized access to company data' });
    }
    
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .query(`
        SELECT 
          CompanyId,
          CompanyCode,
          Description,
          Email,
          ContactPerson,
          IsActive,
          Licenses,
          ExpirationDate,
          w_PrimaryColor,
          w_SecondaryColor
        FROM AR_Companies 
        WHERE CompanyId = @companyId AND IsActive = 1
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;