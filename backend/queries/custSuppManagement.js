const sql = require('mssql');
const config = require('../config');

// Customer and Supplier Types as Constants
const CUSTOMER_TYPE = 3211264;
const SUPPLIER_TYPE = 3211265;

// Get paginated customers/suppliers
const getPaginatedCustSupp = async (page = 0, pageSize = 50, filters = {}, sort = {}) => {
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
      .query(`SELECT COUNT(*) as total FROM MA_CustSupp ${whereClause}`);
    
    const total = countResult.recordset[0].total;

    // Build ORDER BY clause
    const orderBy = sort.field 
      ? `ORDER BY ${sort.field} ${sort.direction || 'ASC'}` 
      : 'ORDER BY CustSupp';

    // Main query with pagination
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(`
      SELECT 
        CustSupp, CompanyName, TaxIdNumber, FiscalCode,
        Address, ZIPCode, City, County, Country,
        Telephone1, Telephone2, EMail, ISOCountryCode,
        ContactPerson, PriceList, CustSuppBank, Payment,
        IBAN, Disabled, Notes, Region, CustSuppType,
        TBCreatedID, TBModifiedID
      FROM MA_CustSupp ${whereClause}
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
    console.error('Error in getPaginatedCustSupp:', err);
    throw err;
  }
};

// Get all customers/suppliers
const getAllCustSupp = async (userId) => {
  try {
    
    const query = `
    SET NOCOUNT ON;
        DECLARE @CompanyId INT = ISNULL( (SELECT CompanyId FROM AR_Users WHERE userId = @UserId),0);

        SELECT  CustSupp
              , CompanyName
              , TaxIdNumber
              , FiscalCode
              , Address
              , ZIPCode
              , City
              , County
              , Country
              , Telephone1
              , Telephone2
              , EMail
              , ISOCountryCode
              , ContactPerson
              , PriceList
              , CustSuppBank
              , Payment
              , IBAN
              , Disabled
              , Notes
              , Region
              , CustSuppType
        FROM MA_CustSupp (NOLOCK)
        WHERE CompanyId = @CompanyId
        ORDER BY CompanyName;
    `;

    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(query);

    // Add derived fields for backward compatibility
    const enhancedResults = result.recordset.map(record => ({
      ...record,
      IsCustomer: record.CustSuppType === CUSTOMER_TYPE,
      IsSupplier: record.CustSuppType === SUPPLIER_TYPE
    }));

    return enhancedResults;
  } catch (err) {
    console.error('Error in getAllCustSupp:', err);
    throw err;
  }
};

// Get countries data
const getCountriesData = async () => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .query(`
                SELECT  * FROM MA_Countries (NOLOCK)
            `);
        return result.recordset;
    } catch (err) {
        console.error('Error in getCountriesData:', err);
        throw err;
    }
};

// Get single customer/supplier by ID
const getCustSuppById = async (CustSupp) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('CustSupp', sql.Int, CustSupp)
      .query(`
        SELECT  CustSupp
              , CompanyName
              , TaxIdNumber
              , FiscalCode
              , Address
              , ZIPCode
              , City
              , County
              , Country
              , Telephone1
              , Telephone2
              , EMail
              , ISOCountryCode
              , ContactPerson
              , PriceList
              , CustSuppBank
              , Payment
              , IBAN
              , Disabled
              , Notes
              , Region
              , CustSuppType
        FROM MA_CustSupp 
        WHERE CustSupp = @CustSupp`);
    
    if (result.recordset[0]) {
      // Add derived fields for backward compatibility
      const record = result.recordset[0];
      return {
        ...record,
        IsCustomer: record.CustSuppType === CUSTOMER_TYPE,
        IsSupplier: record.CustSuppType === SUPPLIER_TYPE
      };
    }
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error in getCustSuppById:', err);
    throw err;
  }
};

// Add or Update multiple customers/suppliers
const updateCustSupp = async (CustSupp, custSuppData, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);

    // Convert IsCustomer and IsSupplier flags to CustSuppType enum
    if ('IsCustomer' in custSuppData || 'IsSupplier' in custSuppData) {
      const isCustomer = custSuppData.IsCustomer;
      const isSupplier = custSuppData.IsSupplier;
      
      // Determine the CustSuppType based on the flags
      if (isCustomer) {
        custSuppData.CustSuppType = CUSTOMER_TYPE;
      } else if (isSupplier) {
        custSuppData.CustSuppType = SUPPLIER_TYPE;
      }
      
      // Remove the old flags as they're no longer needed
      delete custSuppData.IsCustomer;
      delete custSuppData.IsSupplier;
    }

    if (CustSupp === null) {
      // Caso INSERT - nuovo cliente
      const request = pool.request();
      
      // Setup parametri per la stored procedure - Per un nuovo record, passiamo 0 invece di null
      request.input('CustSupp', sql.Int, CustSupp || 0);
      request.input('CompanyName', sql.VarChar(128), custSuppData.CompanyName);
      request.input('TaxIdNumber', sql.VarChar(20), custSuppData.TaxIdNumber || '');
      request.input('FiscalCode', sql.VarChar(20), custSuppData.FiscalCode || '');
      request.input('Address', sql.VarChar(128), custSuppData.Address || '');
      request.input('ZIPCode', sql.VarChar(10), custSuppData.ZIPCode || '');
      request.input('City', sql.VarChar(64), custSuppData.City || '');
      request.input('County', sql.VarChar(3), custSuppData.County || '');
      request.input('Country', sql.VarChar(64), custSuppData.Country || '');
      request.input('Telephone1', sql.VarChar(20), custSuppData.Telephone1 || '');
      request.input('Telephone2', sql.VarChar(20), custSuppData.Telephone2 || '');
      request.input('EMail', sql.VarChar(128), custSuppData.EMail || '');
      request.input('ISOCountryCode', sql.VarChar(2), custSuppData.ISOCountryCode || '');
      request.input('ContactPerson', sql.VarChar(64), custSuppData.ContactPerson || '');
      request.input('PriceList', sql.VarChar(8), custSuppData.PriceList || '');
      request.input('CustSuppBank', sql.VarChar(11), custSuppData.CustSuppBank || '');
      request.input('Payment', sql.VarChar(8), custSuppData.Payment || '');
      request.input('IBAN', sql.VarChar(34), custSuppData.IBAN || '');
      request.input('Disabled', sql.Bit, custSuppData.Disabled ? 1 : 0);
      request.input('Notes', sql.VarChar(1024), custSuppData.Notes || '');
      request.input('Region', sql.VarChar(32), custSuppData.Region || '');
      request.input('CustSuppType', sql.Int, custSuppData.CustSuppType || CUSTOMER_TYPE); // Default to CUSTOMER_TYPE if not specified
      request.input('UserId', sql.Int, userId);

      // Per un nuovo record, non passiamo CustSupp alla SP
      const result = await request.execute('MA_AddUpdateCustSupp');
      return result.recordset[0].success;
    } else {
      
      const request = pool.request()
        .input('CustSupp', sql.Int, CustSupp)
        .input('UserId', sql.Int, userId);

      // Costruisce un array di campi da aggiornare solo se sono presenti in custSuppData
      const updateFields = [];

      if ('CompanyName' in custSuppData) {
        request.input('CompanyName', sql.VarChar(128), custSuppData.CompanyName);
        updateFields.push('CompanyName = @CompanyName');
      }

      if ('TaxIdNumber' in custSuppData) {
        request.input('TaxIdNumber', sql.VarChar(20), custSuppData.TaxIdNumber);
        updateFields.push('TaxIdNumber = @TaxIdNumber');
      }

      if ('FiscalCode' in custSuppData) {
        request.input('FiscalCode', sql.VarChar(20), custSuppData.FiscalCode);
        updateFields.push('FiscalCode = @FiscalCode');
      }

      if ('Address' in custSuppData) {
        request.input('Address', sql.VarChar(128), custSuppData.Address);
        updateFields.push('Address = @Address');
      }

      if ('ZIPCode' in custSuppData) {
        request.input('ZIPCode', sql.VarChar(10), custSuppData.ZIPCode);
        updateFields.push('ZIPCode = @ZIPCode');
      }

      if ('City' in custSuppData) {
        request.input('City', sql.VarChar(64), custSuppData.City);
        updateFields.push('City = @City');
      }

      if ('County' in custSuppData) {
        request.input('County', sql.VarChar(3), custSuppData.County);
        updateFields.push('County = @County');
      }

      if ('Country' in custSuppData) {
        request.input('Country', sql.VarChar(64), custSuppData.Country);
        updateFields.push('Country = @Country');
      }

      if ('Telephone1' in custSuppData) {
        request.input('Telephone1', sql.VarChar(20), custSuppData.Telephone1);
        updateFields.push('Telephone1 = @Telephone1');
      }

      if ('Telephone2' in custSuppData) {
        request.input('Telephone2', sql.VarChar(20), custSuppData.Telephone2);
        updateFields.push('Telephone2 = @Telephone2');
      }

      if ('EMail' in custSuppData) {
        request.input('EMail', sql.VarChar(128), custSuppData.EMail);
        updateFields.push('EMail = @EMail');
      }

      if ('ISOCountryCode' in custSuppData) {
        request.input('ISOCountryCode', sql.VarChar(2), custSuppData.ISOCountryCode);
        updateFields.push('ISOCountryCode = @ISOCountryCode');
      }

      if ('ContactPerson' in custSuppData) {
        request.input('ContactPerson', sql.VarChar(64), custSuppData.ContactPerson);
        updateFields.push('ContactPerson = @ContactPerson');
      }

      if ('PriceList' in custSuppData) {
        request.input('PriceList', sql.VarChar(8), custSuppData.PriceList);
        updateFields.push('PriceList = @PriceList');
      }

      if ('CustSuppBank' in custSuppData) {
        request.input('CustSuppBank', sql.VarChar(11), custSuppData.CustSuppBank);
        updateFields.push('CustSuppBank = @CustSuppBank');
      }

      if ('Payment' in custSuppData) {
        request.input('Payment', sql.VarChar(8), custSuppData.Payment);
        updateFields.push('Payment = @Payment');
      }

      if ('IBAN' in custSuppData) {
        request.input('IBAN', sql.VarChar(34), custSuppData.IBAN);
        updateFields.push('IBAN = @IBAN');
      }

      if ('Disabled' in custSuppData) {
        request.input('Disabled', sql.Bit, custSuppData.Disabled);
        updateFields.push('Disabled = @Disabled');
      }

      if ('Notes' in custSuppData) {
        request.input('Notes', sql.VarChar(1024), custSuppData.Notes);
        updateFields.push('Notes = @Notes');
      }

      if ('Region' in custSuppData) {
        request.input('Region', sql.VarChar(32), custSuppData.Region);
        updateFields.push('Region = @Region');
      }

      if ('CustSuppType' in custSuppData) {
        request.input('CustSuppType', sql.Int, custSuppData.CustSuppType);
        updateFields.push('CustSuppType = @CustSuppType');
      }

      // TBModifiedID 
      request.input('TBModifiedID', sql.Int, userId);

      // Se non ci sono campi da aggiornare, ritorna
      if (updateFields.length === 0) {
        return false;
      }

      // Costruisce la query solo con i campi presenti
      const query = `
        DECLARE @CompanyId INT = ISNULL( (SELECT CompanyId FROM AR_Users WHERE userId = @UserId),0);

        UPDATE MA_CustSupp
        SET   TBModified = GETDATE()
        ,     ${updateFields.join(', ')}
        WHERE CustSupp = @CustSupp
        AND   CompanyId = @CompanyId
      `;

      await request.query(query);
      return true;
    }
  } catch (err) {
    console.error('Error in updateCustSupp:', err);
    throw err;
  }
};
  

// Toggle disable status
const toggleDisableCustSupp = async (CustSupp, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('CustSupp', sql.Int, CustSupp)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CompanyId INT = ISNULL( (SELECT CompanyId FROM AR_Users WHERE userId = @UserId),0);

        UPDATE MA_CustSupp 
        SET Disabled = CASE WHEN Disabled = 1 THEN 0 ELSE 1 END 
        WHERE CustSupp = @CustSupp
        AND CompanyId = @CompanyId;
      `);
    return true;
  } catch (err) {
    console.error('Error in toggleDisableCustSupp:', err);
    throw err;
  }
};

// Aggiornamento / Inserimento di clienti e fornitori in blocco
const addUpdateCustSuppsBulk = async (custSupps, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const results = [];
      for (const custsupp of custSupps) {
        // Convert IsCustomer and IsSupplier to CustSuppType if present
        if ('IsCustomer' in custsupp || 'IsSupplier' in custsupp) {
          if (custsupp.IsCustomer) {
            custsupp.CustSuppType = CUSTOMER_TYPE;
          } else if (custsupp.IsSupplier) {
            custsupp.CustSuppType = SUPPLIER_TYPE;
          }
        }

        const request = new sql.Request(transaction);
        
        // Verifica che CustSupp sia un numero valido
        const custsuppId = parseInt(custsupp.CustSupp);
        if (isNaN(custsuppId)) {
          throw new Error(`CustSupp invalido: ${custsupp.CustSupp}`);
        }

        // Importante: passiamo stringa vuota invece di null per i campi stringa vuoti
        request.input('CustSupp', sql.Int, custsuppId);
        request.input('CompanyName', sql.VarChar(128), custsupp.CompanyName ?? '');
        request.input('TaxIdNumber', sql.VarChar(20), custsupp.TaxIdNumber ?? '');
        request.input('FiscalCode', sql.VarChar(20), custsupp.FiscalCode ?? '');
        request.input('Address', sql.VarChar(128), custsupp.Address ?? '');
        request.input('ZIPCode', sql.VarChar(10), custsupp.ZIPCode ?? '');
        request.input('City', sql.VarChar(64), custsupp.City ?? '');
        request.input('County', sql.VarChar(3), custsupp.County ?? '');
        request.input('Country', sql.VarChar(64), custsupp.Country ?? '');
        request.input('Telephone1', sql.VarChar(20), custsupp.Telephone1 ?? '');
        request.input('Telephone2', sql.VarChar(20), custsupp.Telephone2 ?? '');
        request.input('EMail', sql.VarChar(128), custsupp.EMail ?? '');
        request.input('ISOCountryCode', sql.VarChar(2), custsupp.ISOCountryCode ?? '');
        request.input('ContactPerson', sql.VarChar(64), custsupp.ContactPerson ?? '');
        request.input('PriceList', sql.VarChar(8), custsupp.PriceList ?? '');
        request.input('CustSuppBank', sql.VarChar(11), custsupp.CustSuppBank ?? '');
        request.input('Payment', sql.VarChar(8), custsupp.Payment ?? '');
        request.input('IBAN', sql.VarChar(34), custsupp.IBAN ?? '');
        request.input('Notes', sql.VarChar(1024), custsupp.Notes ?? '');
        request.input('Region', sql.VarChar(32), custsupp.Region ?? '');
        
        // For boolean and enum fields
        request.input('Disabled', sql.Bit, custsupp.Disabled ? 1 : 0);
        request.input('CustSuppType', sql.Int, custsupp.CustSuppType ?? CUSTOMER_TYPE); // Default to CUSTOMER_TYPE
        
        request.input('UserId', sql.Int, userId);

        // Chiamata della stored procedure
        const result = await request.execute('MA_AddUpdateCustSupp');
        results.push({
          custsuppId,
          success: result.recordset[0].success,
          message: result.recordset[0].message
        });
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
    console.error('Error in addUpdateCustSuppsBulk:', err);
    throw err;
  }
};

module.exports = {
  getPaginatedCustSupp,
  getAllCustSupp,
  getCountriesData,
  getCustSuppById,
  toggleDisableCustSupp,
  updateCustSupp,
  addUpdateCustSuppsBulk,
  // Export constants for use in other modules
  CUSTOMER_TYPE,
  SUPPLIER_TYPE
};