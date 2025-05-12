// projectCustomersRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllProjectCustomers,
    getProjectCustomerById,
    updateProjectCustomer,
    toggleDisableProjectCustomer,
    linkToERPCustomer,
    getERPCustomers,
    addUpdateProjectCustomersBulk,
    importERPCustomerAsProspect,
    USTOMER_TYPE,
    SUPPLIER_TYPE
} = require('../queries/projectCustomers');
const { getCountriesData } = require('../queries/custSuppManagement'); // Riutilizziamo la funzione esistente
const authenticateToken = require('../authenticateToken');

// Get all project customers
router.get('/projectCustomers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const customersList = await getAllProjectCustomers(userId);
    res.json(customersList);
  } catch (err) {
    console.error('Error fetching project customers:', err);
    res.status(500).send('Internal server error');
  }
});

// Get countries data (riutilizziamo la route esistente)
router.get('/countriesData', authenticateToken, async (req, res) => {
  try {
    const countriesData = await getCountriesData();
    res.json(countriesData);
  } catch (err) {
    console.error('Error fetching countries data:', err);
    res.status(500).send('Internal server error');
  }
});

// Get project customer by ID
router.get('/projectCustomers/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const customer = await getProjectCustomerById(req.params.id, userId);
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).send('Project customer not found');
    }
  } catch (err) {
    console.error('Error fetching project customer:', err);
    res.status(500).send('Internal server error');
  }
});

// Update project customer
router.put('/projectCustomers/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    const result = await updateProjectCustomer(req.params.id, req.body, userId);
    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Cliente aggiornato con successo',
        newId: result.newId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message || 'Errore nell\'aggiornamento del cliente'
      });
    }
  } catch (err) {
    console.error('Error updating project customer:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Create new project customer
router.post('/projectCustomers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const companyId = req.user.CompanyId;
    // Per un nuovo cliente, passiamo null come Id (la funzione gestirà l'ID)
    const result = await updateProjectCustomer(null, req.body, userId, companyId);
    if (result.success) {
      res.status(201).json({ 
        success: true, 
        message: 'Cliente creato con successo',
        newId: result.newId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message || 'Errore nella creazione del cliente'
      });
    }
  } catch (err) {
    console.error('Error creating project customer:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Toggle disable status for project customer
router.delete('/projectCustomers/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const result = await toggleDisableProjectCustomer(req.params.id, userId);
    if (result) {
      res.status(200).json({
        success: true,
        message: 'Stato disabilitato modificato con successo'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Cliente non trovato'
      });
    }
  } catch (err) {
    console.error('Error toggling project customer disable status:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Link project customer to ERP customer
router.post('/projectCustomers/:id/link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { erpCustSupp } = req.body;
    
    if (!erpCustSupp) {
      return res.status(400).json({
        success: false,
        message: 'Codice cliente ERP mancante'
      });
    }
    
    const result = await linkToERPCustomer(req.params.id, erpCustSupp, userId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error linking project customer to ERP:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Search ERP customers for linking
router.get('/erpCustomers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { search } = req.query;
    
    const customers = await getERPCustomers(search, userId);
    res.json(customers);
  } catch (err) {
    console.error('Error searching ERP customers:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Import project customers in bulk
router.post('/projectCustomers/import', authenticateToken, async (req, res) => {
  try {
    const customers = req.body;
    
    if (!Array.isArray(customers)) {
      return res.status(400).json({
        success: false,
        message: 'Formato dati non valido: è atteso un array di clienti'
      });
    }

    // Validazione base
    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array vuoto: nessun cliente da importare'
      });
    }

    const userId = req.user.UserId;
    const result = await addUpdateProjectCustomersBulk(customers, userId);
    
    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Importazione completata con successo',
        importedCount: customers.length,
        results: result.results
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Errore durante l\'importazione',
        error: result.error
      });
    }
  } catch (err) {
    console.error('Error importing project customers:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// Importa un cliente ERP come prospect
router.post('/projectCustomers/importFromERP', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.UserId;
      const { erpCustSupp } = req.body;
      
      if (!erpCustSupp) {
        return res.status(400).json({
          success: false,
          message: 'Codice cliente ERP mancante'
        });
      }
      
      const result = await importERPCustomerAsProspect(erpCustSupp, userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      console.error('Error importing ERP customer as prospect:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
      });
    }
  });

module.exports = router;