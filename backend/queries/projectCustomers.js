const sql = require('mssql');
const config = require('../config');

// Customer Types as Constants (riutilizzo gli stessi valori del gestionale per coerenza)
const CUSTOMER_TYPE = 3211264;
const SUPPLIER_TYPE = 3211265;

// Get paginated project customers
const getPaginatedProjectCustomers = async (page = 0, pageSize = 50, filters = {}, sort = {}) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Build where clause based on filters
    let whereConditions = [];
    let queryParams = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        whereConditions.push(`${key} LIKE @${key}`);
        queryParams.push({
          name: key,
          value: `%${value}%`,
          type: sql.VarChar
        });
      }
    });

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count
    const countResult = await pool.request()
      .query(`SELECT COUNT(*) as total FROM MA_ProjectCustomers ${whereClause}`);
    
    const total = countResult.recordset[0].total;

    // Build ORDER BY clause
    const orderBy = sort.field 
      ? `ORDER BY ${sort.field} ${sort.direction || 'ASC'}` 
      : 'ORDER BY Id';

    // Main query with pagination
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(`
      SELECT 
        Id, CustomerCode, CompanyName, TaxIdNumber, 
        Address, City, County, Country, ZIPCode,
        ERPCustSupp, ERPCustSuppType, Disabled, 
        fscodice, Creationdate, TBCreatedId, TBModified
      FROM MA_ProjectCustomers ${whereClause}
      ${orderBy}
      OFFSET ${page * pageSize} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);

    return {
      items: result.recordset,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1
    };
  } catch (err) {
    console.error('Error in getPaginatedProjectCustomers:', err);
    throw err;
  }
};

// Get all project customers
const getAllProjectCustomers = async (userId) => {
  try {
    const query = `
      SET NOCOUNT ON;
      DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);

      SELECT 
        Id, CustomerCode, CompanyName, TaxIdNumber, 
        Address, City, County, Country, ZIPCode,
        ERPCustSupp, ERPCustSuppType, Disabled, 
        fscodice, Creationdate, TBCreatedId, TBModified
      FROM MA_ProjectCustomers (NOLOCK)
      WHERE CompanyId = @CompanyId
      ORDER BY CompanyName;
    `;

    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(query);

    // Add derived fields for backward compatibility with front-end
    const enhancedResults = result.recordset.map(record => ({
      ...record,
      // Aggiungiamo un flag per indicare se il customer è già associato a un cliente ERP
      IsAssociatedWithERP: record.ERPCustSupp ? true : false
    }));

    return enhancedResults;
  } catch (err) {
    console.error('Error in getAllProjectCustomers:', err);
    throw err;
  }
};

// Get single project customer by ID
const getProjectCustomerById = async (Id, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('Id', sql.Int, Id)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);
        
        SELECT 
          Id, CustomerCode, CompanyName, TaxIdNumber, 
          Address, City, County, Country, ZIPCode,
          ERPCustSupp, ERPCustSuppType, Disabled, 
          fscodice, Creationdate, TBCreatedId, TBModified
        FROM MA_ProjectCustomers 
        WHERE Id = @Id AND CompanyId = @CompanyId`);
    
    if (result.recordset[0]) {
      // Add derived fields
      const record = result.recordset[0];
      return {
        ...record,
        IsAssociatedWithERP: record.ERPCustSupp ? true : false
      };
    }
    
    return null;
  } catch (err) {
    console.error('Error in getProjectCustomerById:', err);
    throw err;
  }
};

// Add or Update a project customer
const updateProjectCustomer = async (Id, customerData, userId, companyId) => {
  try {
    let pool = await sql.connect(config.dbConfig);

    if (!Id) {
      // INSERT - Nuovo cliente prospect
      const request = pool.request();
      
      // Setup parametri per l'inserimento
      request.input('CompanyId', sql.Int, companyId);
      request.input('CustomerCode', sql.VarChar(50), customerData.CustomerCode || '');
      request.input('CompanyName', sql.VarChar(128), customerData.CompanyName);
      request.input('TaxIdNumber', sql.VarChar(20), customerData.TaxIdNumber || '');
      request.input('Address', sql.VarChar(128), customerData.Address || '');
      request.input('City', sql.VarChar(64), customerData.City || '');
      request.input('County', sql.VarChar(3), customerData.County || '');
      request.input('Country', sql.VarChar(64), customerData.Country || '');
      request.input('ZIPCode', sql.VarChar(10), customerData.ZIPCode || '');
      request.input('ERPCustSupp', sql.VarChar(12), customerData.ERPCustSupp || '');
      request.input('ERPCustSuppType', sql.Int, customerData.ERPCustSuppType || CUSTOMER_TYPE);
      request.input('Disabled', sql.Int, customerData.Disabled ? 1 : 0);
      request.input('fscodice', sql.VarChar(64), customerData.fscodice || '');
      request.input('TBCreatedId', sql.Int, userId);
      
      const query = `

          DECLARE @Id INT = (SELECT ISNULL(MAX(Id), 0) + 1 FROM MA_ProjectCustomers WHERE CompanyId = @CompanyId);

        INSERT INTO MA_ProjectCustomers (
          CompanyId, Id, CustomerCode, CompanyName, TaxIdNumber, 
          Address, City, County, Country, ZIPCode,
          ERPCustSupp, ERPCustSuppType, Disabled, fscodice, 
          Creationdate, TBCreatedId
        ) VALUES (
          @CompanyId, @Id, @CustomerCode, @CompanyName, @TaxIdNumber, 
          @Address, @City, @County, @Country, @ZIPCode,
          @ERPCustSupp, @ERPCustSuppType, @Disabled, @fscodice, 
          GETDATE(), @TBCreatedId
        )
        
        SELECT @Id AS newId
      `;
      
      const result = await request.query(query);
      return { success: true, newId: result.recordset[0].newId };
    } else {
      // UPDATE - Aggiornamento cliente esistente
      const request = pool.request()
        .input('Id', sql.Int, Id)
        .input('UserId', sql.Int, userId);

      // Get CompanyId from userId
      const companyResult = await request.query('SELECT CompanyId FROM AR_Users WHERE userId = @UserId');
      const companyId = companyResult.recordset[0]?.CompanyId || 0;
      // Non dichiariamo una seconda volta il parametro, lo utilizziamo direttamente nella query

      // Costruisce un array di campi da aggiornare solo se sono presenti in customerData
      const updateFields = [];

      if ('CustomerCode' in customerData) {
        request.input('CustomerCode', sql.VarChar(50), customerData.CustomerCode);
        updateFields.push('CustomerCode = @CustomerCode');
      }

      if ('CompanyName' in customerData) {
        request.input('CompanyName', sql.VarChar(128), customerData.CompanyName);
        updateFields.push('CompanyName = @CompanyName');
      }

      if ('TaxIdNumber' in customerData) {
        request.input('TaxIdNumber', sql.VarChar(20), customerData.TaxIdNumber);
        updateFields.push('TaxIdNumber = @TaxIdNumber');
      }

      if ('Address' in customerData) {
        request.input('Address', sql.VarChar(128), customerData.Address);
        updateFields.push('Address = @Address');
      }

      if ('City' in customerData) {
        request.input('City', sql.VarChar(64), customerData.City);
        updateFields.push('City = @City');
      }

      if ('County' in customerData) {
        request.input('County', sql.VarChar(3), customerData.County);
        updateFields.push('County = @County');
      }

      if ('Country' in customerData) {
        request.input('Country', sql.VarChar(64), customerData.Country);
        updateFields.push('Country = @Country');
      }
      
      if ('Region' in customerData) {
        request.input('Region', sql.VarChar(32), customerData.Region);
        updateFields.push('Region = @Region');
      }

      if ('ZIPCode' in customerData) {
        request.input('ZIPCode', sql.VarChar(10), customerData.ZIPCode);
        updateFields.push('ZIPCode = @ZIPCode');
      }

      if ('ERPCustSupp' in customerData) {
        request.input('ERPCustSupp', sql.VarChar(12), customerData.ERPCustSupp);
        updateFields.push('ERPCustSupp = @ERPCustSupp');
      }

      if ('ERPCustSuppType' in customerData) {
        request.input('ERPCustSuppType', sql.Int, customerData.ERPCustSuppType);
        updateFields.push('ERPCustSuppType = @ERPCustSuppType');
      }

      if ('Disabled' in customerData) {
        request.input('Disabled', sql.Int, customerData.Disabled ? 1 : 0);
        updateFields.push('Disabled = @Disabled');
      }

      if ('fscodice' in customerData) {
        request.input('fscodice', sql.VarChar(64), customerData.fscodice);
        updateFields.push('fscodice = @fscodice');
      }

      // TBModified
      request.input('TBModifiedId', sql.Int, userId);
      updateFields.push('TBModified = @TBModifiedId');

      // Se non ci sono campi da aggiornare, ritorna
      if (updateFields.length === 0) {
        return { success: false, message: 'Nessun campo da aggiornare' };
      }

      // Costruisce la query solo con i campi presenti
      const query = `
        UPDATE MA_ProjectCustomers
        SET ${updateFields.join(', ')}
        WHERE Id = @Id AND CompanyId = ${companyId}
      `;

      await request.query(query);
      return { success: true };
    }
  } catch (err) {
    console.error('Error in updateProjectCustomer:', err);
    throw err;
  }
};

// Toggle disable status
const toggleDisableProjectCustomer = async (Id, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('Id', sql.Int, Id)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);

        UPDATE MA_ProjectCustomers
        SET Disabled = CASE WHEN Disabled = 1 THEN 0 ELSE 1 END
        WHERE Id = @Id AND CompanyId = @CompanyId;
      `);
    return true;
  } catch (err) {
    console.error('Error in toggleDisableProjectCustomer:', err);
    throw err;
  }
};

// Link project customer to ERP CustSupp
const linkToERPCustomer = async (Id, erpCustSupp, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Prima, otteniamo i dati del cliente ERP
    const erpCustomerResult = await pool.request()
      .input('CustSupp', sql.VarChar(12), erpCustSupp)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);
        
        SELECT 
          CustSupp, CustSuppType, CompanyName, TaxIdNumber, Address,
          ZIPCode, City, County, Country
        FROM MA_CustSupp
        WHERE CustSupp = @CustSupp AND CompanyId = @CompanyId
      `);
    
    if (erpCustomerResult.recordset.length === 0) {
      return { 
        success: false, 
        message: 'Cliente ERP non trovato'
      };
    }
    
    const erpCustomer = erpCustomerResult.recordset[0];
    
    // Poi, aggiorniamo il cliente progetto con i dati del cliente ERP
    await pool.request()
      .input('Id', sql.Int, Id)
      .input('UserId', sql.Int, userId)
      .input('ERPCustSupp', sql.VarChar(12), erpCustomer.CustSupp)
      .input('ERPCustSuppType', sql.Int, erpCustomer.CustSuppType)
      .input('CompanyName', sql.VarChar(128), erpCustomer.CompanyName)
      .input('TaxIdNumber', sql.VarChar(20), erpCustomer.TaxIdNumber)
      .input('Address', sql.VarChar(128), erpCustomer.Address)
      .input('City', sql.VarChar(64), erpCustomer.City)
      .input('County', sql.VarChar(3), erpCustomer.County)
      .input('Country', sql.VarChar(64), erpCustomer.Country)
      .input('ZIPCode', sql.VarChar(10), erpCustomer.ZIPCode)
      .query(`
        DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);

        UPDATE MA_ProjectCustomers
        SET ERPCustSupp = @ERPCustSupp,
            ERPCustSuppType = @ERPCustSuppType,
            CompanyName = @CompanyName,
            TaxIdNumber = @TaxIdNumber,
            Address = @Address,
            City = @City,
            County = @County,
            Country = @Country,
            ZIPCode = @ZIPCode,
            TBModified = @UserId
        WHERE Id = @Id AND CompanyId = @CompanyId
      `);
    
    return { 
      success: true, 
      message: 'Cliente progetto collegato con successo al cliente ERP'
    };
  } catch (err) {
    console.error('Error in linkToERPCustomer:', err);
    throw err;
  }
};

// Get ERP customers for linking
const getERPCustomers = async (searchText, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('SearchText', sql.VarChar(128), `%${searchText || ''}%`)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @UserId), 0);

        SELECT TOP 50
          CustSupp, CompanyName, TaxIdNumber, Address, City, Country
        FROM MA_CustSupp (NOLOCK)
        WHERE CompanyId = @CompanyId
          AND CustSuppType = ${CUSTOMER_TYPE}  -- Solo clienti, non fornitori
          AND (CompanyName LIKE @SearchText OR CustSupp LIKE @SearchText)
        ORDER BY CompanyName
      `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error in getERPCustomers:', err);
    throw err;
  }
};

// Aggiornamento / Inserimento di clienti in blocco
const addUpdateProjectCustomersBulk = async (customers, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Get CompanyId from userId
      const companyRequest = new sql.Request(transaction);
      const companyResult = await companyRequest
        .input('UserId', sql.Int, userId)
        .query('SELECT CompanyId FROM AR_Users WHERE userId = @UserId');
      
      const companyId = companyResult.recordset[0]?.CompanyId || 0;
      
      const results = [];
      for (const customer of customers) {
        const request = new sql.Request(transaction);
        
        let customerId = parseInt(customer.Id);
        let isNew = false;
        
        // Se Id non è presente o è 0, è un nuovo cliente
        if (isNaN(customerId) || customerId <= 0) {
          // Get next Id
          const nextIdResult = await request
            .input('CompanyId', sql.Int, companyId)
            .query(`
              SELECT ISNULL(MAX(Id), 0) + 1 AS NextId 
              FROM MA_ProjectCustomers 
              WHERE CompanyId = @CompanyId
            `);
          
          customerId = nextIdResult.recordset[0].NextId;
          isNew = true;
        }
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('Id', sql.Int, customerId);
        request.input('CustomerCode', sql.VarChar(50), customer.CustomerCode || '');
        request.input('CompanyName', sql.VarChar(128), customer.CompanyName || '');
        request.input('TaxIdNumber', sql.VarChar(20), customer.TaxIdNumber || '');
        request.input('Address', sql.VarChar(128), customer.Address || '');
        request.input('City', sql.VarChar(64), customer.City || '');
        request.input('County', sql.VarChar(3), customer.County || '');
        request.input('Country', sql.VarChar(64), customer.Country || '');
        request.input('ZIPCode', sql.VarChar(10), customer.ZIPCode || '');
        request.input('ERPCustSupp', sql.VarChar(12), customer.ERPCustSupp || '');
        request.input('ERPCustSuppType', sql.Int, customer.ERPCustSuppType || CUSTOMER_TYPE);
        request.input('Disabled', sql.Int, customer.Disabled ? 1 : 0);
        request.input('fscodice', sql.VarChar(64), customer.fscodice || '');
        request.input('UserId', sql.Int, userId);
        
        if (isNew) {
          // INSERT
          const insertQuery = `
            INSERT INTO MA_ProjectCustomers (
              CompanyId, Id, CustomerCode, CompanyName, TaxIdNumber, 
              Address, City, County, Country, ZIPCode,
              ERPCustSupp, ERPCustSuppType, Disabled, fscodice, 
              Creationdate, TBCreatedId
            ) VALUES (
              @CompanyId, @Id, @CustomerCode, @CompanyName, @TaxIdNumber, 
              @Address, @City, @County, @Country, @ZIPCode,
              @ERPCustSupp, @ERPCustSuppType, @Disabled, @fscodice, 
              GETDATE(), @UserId
            )
          `;
          
          await request.query(insertQuery);
          
          results.push({
            id: customerId,
            success: true,
            message: 'Cliente inserito con successo'
          });
        } else {
          // UPDATE
          const updateQuery = `
            UPDATE MA_ProjectCustomers
            SET CustomerCode = @CustomerCode,
                CompanyName = @CompanyName,
                TaxIdNumber = @TaxIdNumber,
                Address = @Address,
                City = @City,
                County = @County,
                Country = @Country,
                ZIPCode = @ZIPCode,
                ERPCustSupp = @ERPCustSupp,
                ERPCustSuppType = @ERPCustSuppType,
                Disabled = @Disabled,
                fscodice = @fscodice,
                TBModified = @UserId
            WHERE Id = @Id AND CompanyId = @CompanyId
          `;
          
          const updateResult = await request.query(updateQuery);
          
          results.push({
            id: customerId,
            success: updateResult.rowsAffected[0] > 0,
            message: updateResult.rowsAffected[0] > 0 
              ? 'Cliente aggiornato con successo' 
              : 'Nessun cliente aggiornato'
          });
        }
      }
      
      await transaction.commit();
      return { 
        success: true, 
        results,
        message: 'Operazione completata'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Error in addUpdateProjectCustomersBulk:', err);
    throw err;
  }
};

/**
 * Importa un cliente dall'anagrafica ERP (MA_CustSupp) come nuovo prospect
 * Verifica che non esista già un prospect con lo stesso CustSupp e CustSuppType
 */
const importERPCustomerAsProspect = async (erpCustSupp, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Ottieni CompanyId dall'userId
      const companyRequest = new sql.Request(transaction);
      const companyResult = await companyRequest
        .input('UserId', sql.Int, userId)
        .query('SELECT CompanyId FROM AR_Users WHERE userId = @UserId');
      
      const companyId = companyResult.recordset[0]?.CompanyId || 0;
      
      // Verifica se esiste già un prospect con lo stesso CustSupp
      const checkRequest = new sql.Request(transaction);
      const checkResult = await checkRequest
        .input('CompanyId', sql.Int, companyId)
        .input('ERPCustSupp', sql.VarChar(12), erpCustSupp)
        .query(`
          SELECT Id FROM MA_ProjectCustomers 
          WHERE CompanyId = @CompanyId AND ERPCustSupp = @ERPCustSupp
        `);
      
      if (checkResult.recordset.length > 0) {
        // Già esiste un prospect con questo CustSupp
        await transaction.rollback();
        return { 
          success: false, 
          message: 'Esiste già un prospect collegato a questo cliente ERP'
        };
      }
      
      // Ottieni i dati del cliente dall'anagrafica ERP
      const erpCustomerRequest = new sql.Request(transaction);
      const erpCustomerResult = await erpCustomerRequest
        .input('CustSupp', sql.VarChar(12), erpCustSupp)
        .input('CompanyId', sql.Int, companyId)
        .query(`
          SELECT 
            CustSupp, CustSuppType, CompanyName, TaxIdNumber, FiscalCode,
            Address, ZIPCode, City, County, Country, Region, 
            Telephone1, Telephone2, EMail, ContactPerson,
            ISOCountryCode
          FROM MA_CustSupp
          WHERE CustSupp = @CustSupp AND CompanyId = @CompanyId
        `);
      
      if (erpCustomerResult.recordset.length === 0) {
        // Cliente ERP non trovato
        await transaction.rollback();
        return { 
          success: false, 
          message: 'Cliente ERP non trovato'
        };
      }
      
      const erpCustomer = erpCustomerResult.recordset[0];
      
      // Ottieni il prossimo Id disponibile per i prospect
      const nextIdRequest = new sql.Request(transaction);
      const nextIdResult = await nextIdRequest
        .input('CompanyId', sql.Int, companyId)
        .query(`
          SELECT ISNULL(MAX(Id), 0) + 1 AS NextId 
          FROM MA_ProjectCustomers 
          WHERE CompanyId = @CompanyId
        `);
      
      const newProspectId = nextIdResult.recordset[0].NextId;
      
      // Crea un nuovo prospect con i dati del cliente ERP
      const insertRequest = new sql.Request(transaction);
      insertRequest.input('CompanyId', sql.Int, companyId);
      insertRequest.input('Id', sql.Int, newProspectId);
      insertRequest.input('CustomerCode', sql.VarChar(50), erpCustomer.CustSupp || '');
      insertRequest.input('CompanyName', sql.VarChar(128), erpCustomer.CompanyName || '');
      insertRequest.input('TaxIdNumber', sql.VarChar(20), erpCustomer.TaxIdNumber || '');
      insertRequest.input('Address', sql.VarChar(128), erpCustomer.Address || '');
      insertRequest.input('City', sql.VarChar(64), erpCustomer.City || '');
      insertRequest.input('County', sql.VarChar(3), erpCustomer.County || '');
      insertRequest.input('Country', sql.VarChar(64), erpCustomer.Country || '');
      insertRequest.input('ZIPCode', sql.VarChar(10), erpCustomer.ZIPCode || '');
      insertRequest.input('ERPCustSupp', sql.VarChar(12), erpCustomer.CustSupp);
      insertRequest.input('ERPCustSuppType', sql.Int, erpCustomer.CustSuppType);
      insertRequest.input('Disabled', sql.Int, 0);
      insertRequest.input('UserId', sql.Int, userId);
      
      const insertQuery = `
        INSERT INTO MA_ProjectCustomers (
          CompanyId, Id, CustomerCode, CompanyName, TaxIdNumber, 
          Address, City, County, Country, ZIPCode,
          ERPCustSupp, ERPCustSuppType, Disabled, 
          Creationdate, TBCreatedId
        ) VALUES (
          @CompanyId, @Id, @CustomerCode, @CompanyName, @TaxIdNumber, 
          @Address, @City, @County, @Country, @ZIPCode,
          @ERPCustSupp, @ERPCustSuppType, @Disabled, 
          GETDATE(), @UserId
        )
      `;
      
      await insertRequest.query(insertQuery);
      await transaction.commit();
      
      return { 
        success: true, 
        message: 'Cliente importato con successo',
        prospectId: newProspectId
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Error in importERPCustomerAsProspect:', err);
    throw err;
  }
};

module.exports = {
  getPaginatedProjectCustomers,
  getAllProjectCustomers,
  getProjectCustomerById,
  updateProjectCustomer,
  toggleDisableProjectCustomer,
  linkToERPCustomer,
  getERPCustomers,
  addUpdateProjectCustomersBulk,
  importERPCustomerAsProspect,
  // Export constants for use in other modules
  CUSTOMER_TYPE,
  SUPPLIER_TYPE
};