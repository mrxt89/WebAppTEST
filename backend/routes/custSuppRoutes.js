// custSuppRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllCustSupp,
  getCountriesData,
  getCustSuppById,
  updateCustSupp,
  toggleDisableCustSupp,
  addUpdateCustSuppsBulk,
  CUSTOMER_TYPE,
  SUPPLIER_TYPE
} = require('../queries/custSuppManagement');
const authenticateToken = require('../authenticateToken');

// Get all customers and suppliers
router.get('/custSupp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const custSuppList = await getAllCustSupp(userId);
    res.json(custSuppList);
  } catch (err) {
    console.error('Error fetching customers and suppliers:', err);
    res.status(500).send('Internal server error');
  }
});

// Get utility datas
router.get('/countriesData', authenticateToken, async (req, res) => {
  try {
    const utilityData = await getCountriesData();
    res.json(utilityData);
  } catch (err) {
    console.error('Error fetching utility datas:', err);
    res.status(500).send('Internal server error');
  }
});

// Get customer or supplier by ID
router.get('/custSupp/:id', authenticateToken, async (req, res) => {
  try {
    const custSupp = await getCustSuppById(req.params.id);
    if (custSupp) {
      res.json(custSupp);
    } else {
      res.status(404).send('Customer/Supplier not found');
    }
  } catch (err) {
    console.error('Error fetching customer/supplier:', err);
    res.status(500).send('Internal server error');
  }
});

// Update CustSupp
router.put('/custSupp/:CustSupp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    console.log('userId:', userId);
    
    // Convert IsCustomer/IsSupplier to CustSuppType if needed
    const updatedData = { ...req.body };
    if ('IsCustomer' in updatedData || 'IsSupplier' in updatedData) {
      if (updatedData.IsCustomer) {
        updatedData.CustSuppType = CUSTOMER_TYPE;
      } else if (updatedData.IsSupplier) {
        updatedData.CustSuppType = SUPPLIER_TYPE;
      }
      // Remove old fields
      delete updatedData.IsCustomer;
      delete updatedData.IsSupplier;
    }
    
    const result = await updateCustSupp(req.params.CustSupp, updatedData, userId);
    if (result) {
      res.status(200).send('CustSupp aggiornato con successo');
    } else {
      res.status(404).send('CustSupp non trovato');
    }
  } catch (err) {
    console.error('Error updating CustSupp:', err);
    res.status(500).send('Internal server error');
  }
});

// Create new CustSupp
router.post('/custSupp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    // Convert IsCustomer/IsSupplier to CustSuppType
    const newData = { ...req.body };
    if ('IsCustomer' in newData || 'IsSupplier' in newData) {
      if (newData.IsCustomer) {
        newData.CustSuppType = CUSTOMER_TYPE;
      } else if (newData.IsSupplier) {
        newData.CustSuppType = SUPPLIER_TYPE;
      }
      // Remove old fields
      delete newData.IsCustomer;
      delete newData.IsSupplier;
    }
    
    // Per un nuovo cliente, passiamo null come CustSupp (la stored procedure gestirà l'ID)
    const result = await updateCustSupp(null, newData, userId);
    if (result) {
      res.status(200).json({ success: true, message: 'Cliente/Fornitore creato con successo' });
    } else {
      res.status(400).json({ success: false, message: 'Errore nella creazione del cliente/fornitore' });
    }
  } catch (err) {
    console.error('Error creating CustSupp:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: err.message 
    });
  }
});

// Import clienti e fornitori in bulk with improved validation
router.post('/custSupp/import', authenticateToken, async (req, res) => {
  try {
    const custSupps = req.body;
    
    if (!Array.isArray(custSupps)) {
      return res.status(400).json({
        error: 'Invalid input: expected an array of custSupps'
      });
    }

    // Validate each item
    const errorDetails = [];
    const validItems = custSupps.filter((item, index) => {
      const errors = [];

      // Validazione campi obbligatori
      if (!item.CustSupp) {
        errors.push(`CustSupp è obbligatorio`);
        return false;
      }

      if (typeof item.CustSupp !== 'number') {
        item.CustSupp = parseInt(item.CustSupp, 10);
        if (isNaN(item.CustSupp)) {
          errors.push(`CustSupp deve essere un numero valido`);
          return false;
        }
      }

      if (!item.CompanyName) {
        errors.push(`CompanyName è obbligatorio`);
        return false;
      }

      // Converte e valida i campi booleani e ora CustSuppType
      if ('IsCustomer' in item || 'IsSupplier' in item) {
        // Convert boolean flags to enum value
        const isCustomer = typeof item.IsCustomer === 'string' 
                          ? item.IsCustomer.toLowerCase() === 'true' || item.IsCustomer === '1'
                          : Boolean(item.IsCustomer);
        
        const isSupplier = typeof item.IsSupplier === 'string'
                          ? item.IsSupplier.toLowerCase() === 'true' || item.IsSupplier === '1'
                          : Boolean(item.IsSupplier);
                          
        // Set CustSuppType based on boolean flags
        if (isCustomer) {
          item.CustSuppType = CUSTOMER_TYPE;
        } else if (isSupplier) {
          item.CustSuppType = SUPPLIER_TYPE;
        } else {
          // Default to CUSTOMER_TYPE if neither is set
          item.CustSuppType = CUSTOMER_TYPE;
        }
        
        // Remove old fields
        delete item.IsCustomer;
        delete item.IsSupplier;
      }
      
      // If CustSuppType is directly provided, ensure it's one of the valid types
      if ('CustSuppType' in item && item.CustSuppType !== CUSTOMER_TYPE && item.CustSuppType !== SUPPLIER_TYPE) {
        errors.push(`CustSuppType deve essere ${CUSTOMER_TYPE} (cliente) o ${SUPPLIER_TYPE} (fornitore)`);
      }

      // Handle Disabled field
      if (item.Disabled !== undefined) {
        if (typeof item.Disabled === 'string') {
          item.Disabled = item.Disabled.toLowerCase() === 'true' || item.Disabled === '1' ? 1 : 0;
        } else if (typeof item.Disabled === 'boolean') {
          item.Disabled = item.Disabled ? 1 : 0;
        } else if (typeof item.Disabled === 'number') {
          item.Disabled = item.Disabled === 1 ? 1 : 0;
        } else {
          item.Disabled = 0;
        }
      }

      // Validazione lunghezze massime per campi stringa
      const stringValidations = {
        CompanyName: 128,
        TaxIdNumber: 20,
        FiscalCode: 20,
        Address: 128,
        ZIPCode: 10,
        City: 64,
        County: 3,
        Country: 64,
        Telephone1: 20,
        Telephone2: 20,
        EMail: 128,
        ISOCountryCode: 2,
        ContactPerson: 64,
        PriceList: 8,
        CustSuppBank: 11,
        Payment: 8,
        IBAN: 34,
        Notes: 1024,
        Region: 32
      };

      Object.entries(stringValidations).forEach(([field, maxLength]) => {
        if (item[field]) {
          item[field] = String(item[field]).trim();
          if (item[field].length > maxLength) {
            errors.push(`${field} supera la lunghezza massima di ${maxLength} caratteri`);
          }
        }
      });

      if (errors.length > 0) {
        errorDetails.push({
          index: index + 1,
          custsuppId: item.CustSupp,
          errors: errors
        });
        return false;
      }

      return true;
    });

    if (validItems.length === 0) {
      return res.status(400).json({
        error: 'Nessun record valido trovato per l\'importazione',
        details: errorDetails.map(item => 
          `Riga ${item.index} (CustSupp: ${item.custsuppId}): ${item.errors.join(', ')}`
        )
      });
    }

    if (errorDetails.length > 0) {
      console.log('Warning: alcuni record non sono validi:', errorDetails);
    }

    const userId = req.user.UserId;

    const result = await addUpdateCustSuppsBulk(validItems, userId);
    
    if (result.success) {
      res.status(200).json({ 
        message: 'Importazione completata con successo',
        importedCount: validItems.length,
        totalRecords: custSupps.length,
        skippedRecords: custSupps.length - validItems.length,
        warnings: errorDetails.length > 0 ? errorDetails : undefined
      });
    } else {
      res.status(400).json({
        error: 'Errore durante l\'importazione',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Error importing custSupps:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});


// Disable customer or supplier
router.delete('/custSupp/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    const result = await toggleDisableCustSupp(req.params.id, userId);
    if (result) {
      res.status(200).send('Customer/Supplier disabled successfully');
    } else {
      res.status(404).send('Customer/Supplier not found');
    }
  } catch (err) {
    console.error('Error disabling customer/supplier:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;