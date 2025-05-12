const sql = require('mssql');
const bcrypt = require('bcrypt');
const config = require('../config');

async function getUserById(userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM AR_Users WHERE userId = @userId');
    return result.recordset[0];
  } catch (err) {
    console.error('Error fetching user:', err);
    throw err;
  }
}

async function getAllUsers(userId) {
  const query = `
SELECT	
    T0.userId
	, T0.username
	, T0.firstName
	, T0.lastName
	, T0.email
	, T0.userBadge
	, T0.userDisabled
	, T0.role
	, T0.phoneNumber
	, T0.CompanyId
	, T1.Description AS companyName
	, (
        SELECT STRING_AGG(T1.groupName, ', ') 
        FROM AR_Groups T1
        JOIN AR_GroupMembers T2 ON T2.groupId = T1.groupId
        WHERE T2.userId = T0.userId
    ) AS groups
FROM	AR_Users (NOLOCK) T0
JOIN	AR_Companies (NOLOCK) T1 ON T1.CompanyId = T0.CompanyId
WHERE	( LicenseExpiration = '1799-12-31' OR LicenseExpiration >= CAST(GETDATE() AS DATE) )
FOR JSON PATH

  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);

    return JSON.parse(result.recordset[0]['JSON_F52E2B61-18A1-11d1-B105-00805F49916B']); // Parse JSON
  } catch (err) {
    console.error('Error fetching users:', err);
    throw err;
  }
}

async function toggleUserStatus(userId, userDisabled) {
  const query = 'UPDATE AR_Users SET userDisabled = @userDisabled WHERE userId = @userId';
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('userDisabled', sql.Bit, userDisabled)
      .query(query);
    return true;
  } catch (err) {
    console.error('Error updating user status:', err);
    throw err;
  }
}


async function changePassword(userId, currentPassword, newPassword) {
  const query = 'SELECT * FROM AR_Users WHERE userId = @userId';
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);
    const user = result.recordset[0];
    if (user && await bcrypt.compare(currentPassword, user.password)) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery = 'UPDATE AR_Users SET password = @password WHERE userId = @userId';
      await pool.request()
        .input('password', sql.VarChar, hashedPassword)
        .input('userId', sql.Int, userId)
        .query(updateQuery);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error('Error changing password:', err);
    throw err;
  }
}

async function resetPassword(userId, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE AR_Users SET password = @password, salt = \'10\' WHERE userId = @userId';
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('password', sql.NVarChar, hashedPassword)
      .input('userId', sql.Int, userId)
      .query(query);
    return true;
  } catch (err) {
    console.error('Error resetting password:', err);
    throw err;
  }
}

async function updateUser(data) {
  const { userId, username, email, firstName, lastName, phoneNumber, address, role } = data;
  const query = `
    UPDATE AR_Users 
    SET email = @Email, firstName = @firstName, lastName = @lastName, phoneNumber = @phoneNumber, address = @address, role = CASE WHEN @role = '' THEN role ELSE @role END
    WHERE userId = @userId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('email', sql.VarChar, email)
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('phoneNumber', sql.VarChar, phoneNumber ? phoneNumber : '')
      .input('userId', sql.Int, userId)
      .input('address', sql.VarChar, address ? address : '')
      .input('role', sql.VarChar, role)
      .query(query);
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
}

async function addUser(data) {
  const { username, password, email, firstName, lastName, userBadge, role, phoneNumber, userId, companies } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sanitizedUserBadge = userBadge || 0;
  const sanitizedEmail = email || '';
  const sanitizedFirstName = firstName || '';
  const sanitizedLastName = lastName || '';
  const sanitizedRole = role || '';
  const sanitizedPhoneNumber = phoneNumber || '';
  
  // Ottieni il CompanyId dell'utente che sta eseguendo l'operazione come default
  let defaultCompanyId = 0;
  try {
    let pool = await sql.connect(config.dbConfig);
    const companyResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT CompanyId FROM AR_Users WHERE userId = @userId');
    
    if (companyResult.recordset.length > 0) {
      defaultCompanyId = companyResult.recordset[0].CompanyId;
    }
  } catch (error) {
    console.error('Error getting default CompanyId:', error);
  }
  
  // Utilizza la prima azienda selezionata o quella di default
  const primaryCompanyId = companies && companies.length > 0 ? companies[0] : defaultCompanyId;
  
  const queryCheckUsername = 'SELECT COUNT(*) AS count FROM AR_Users WHERE username = @username';
  const queryInsertUser = `
    DECLARE @MaxLicenses INT = ISNULL((SELECT TOP(1) Licenses FROM AR_Companies WHERE CompanyId = @CompanyId),0)

    IF @MaxLicenses > 0 AND (SELECT COUNT(*) FROM AR_Users WHERE CompanyId = @CompanyId AND ( LicenseExpiration >= CAST(GETDATE() AS DATE) OR LicenseExpiration = '1799-12-31' ) AND userDisabled = 0) >= @MaxLicenses
    BEGIN
      RAISERROR('Numero massimo di licenze raggiunto', 16, 1)
      RETURN
    END

    INSERT INTO AR_Users (username, password, salt, email, firstName, lastName, userBadge, joinDate, accountStatus, userDisabled, role, phoneNumber, CompanyId)
    VALUES (@username, @password, '10', @Email, @firstName, @lastName, @userBadge, GETDATE(), 1, 0, @role, @phoneNumber, @CompanyId)
    
    DECLARE @NewUserId INT = SCOPE_IDENTITY()
    
    -- Restituisci l'ID dell'utente appena creato
    SELECT @NewUserId AS NewUserId
  `;
  
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(queryCheckUsername);
      
    if (result.recordset[0].count > 0) {
      return { success: false, message: 'Username già in uso' };
    }
    
    const insertResult = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .input('Email', sql.VarChar, sanitizedEmail)
      .input('firstName', sql.VarChar, sanitizedFirstName)
      .input('lastName', sql.VarChar, sanitizedLastName)
      .input('userBadge', sql.Int, sanitizedUserBadge)
      .input('role', sql.VarChar, sanitizedRole)
      .input('phoneNumber', sql.VarChar, sanitizedPhoneNumber)
      .input('CompanyId', sql.Int, primaryCompanyId)
      .query(queryInsertUser);
    
    // Ottieni l'ID dell'utente appena creato
    const newUserId = insertResult.recordset[0].NewUserId;
    
    // Associa l'utente alle aziende selezionate
    if (companies && companies.length > 0) {
      for (const companyId of companies) {
        await assignUserToCompany(newUserId, companyId);
      }
    } else if (defaultCompanyId > 0) {
      // Se non sono state selezionate aziende, associa l'utente all'azienda di default
      await assignUserToCompany(newUserId, defaultCompanyId);
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error adding user:', err);
    throw err;
  }
}



// Funzione per ottenere le aziende associate a un utente
async function getUserCompanies(userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT c.CompanyId, c.Description, c.CompanyCode
        FROM AR_CompaniesUsers cu
        JOIN AR_Companies c ON cu.CompanyId = c.CompanyId
        WHERE cu.UserId = @userId AND c.IsActive = 1
        ORDER BY c.Description
      `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching user companies:', err);
    throw err;
  }
}

// Funzione per ottenere tutte le aziende disponibili
async function getAllCompanies() {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .query(`
        SELECT CompanyId, CompanyCode, Description, Email, IsActive
        FROM AR_Companies 
        WHERE IsActive = 1
        ORDER BY Description
      `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching companies:', err);
    throw err;
  }
}

// Funzione per associare un utente a un'azienda
async function assignUserToCompany(userId, companyId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Verifica se l'associazione esiste già
    const checkResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count 
        FROM AR_CompaniesUsers 
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    // Se l'associazione non esiste, la crea
    if (checkResult.recordset[0].count === 0) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('companyId', sql.Int, companyId)
        .query(`
          INSERT INTO AR_CompaniesUsers (UserId, CompanyId)
          VALUES (@userId, @companyId)
        `);
    }
    
    return true;
  } catch (err) {
    console.error('Error assigning user to company:', err);
    throw err;
  }
}

// Funzione per rimuovere l'associazione di un utente da un'azienda
async function removeUserFromCompany(userId, companyId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Conta quante associazioni ha l'utente
    const countResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT COUNT(*) AS count 
        FROM AR_CompaniesUsers 
        WHERE UserId = @userId
      `);
    
    // Se l'utente ha solo un'azienda, non permettere la rimozione
    if (countResult.recordset[0].count <= 1) {
      return { success: false, message: 'L\'utente deve essere associato ad almeno un\'azienda' };
    }
    
    // Rimuovi l'associazione
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        DELETE FROM AR_CompaniesUsers 
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    return { success: true };
  } catch (err) {
    console.error('Error removing user from company:', err);
    throw err;
  }
}

// Funzione per aggiornare l'azienda principale di un utente (CompanyId in AR_Users)
async function updateUserPrimaryCompany(userId, companyId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Verifica se l'utente è associato all'azienda
    const checkResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count 
        FROM AR_CompaniesUsers 
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    // Se l'associazione non esiste, restituisci un errore
    if (checkResult.recordset[0].count === 0) {
      return { success: false, message: 'L\'utente non è associato a questa azienda' };
    }
    
    // Aggiorna l'azienda principale dell'utente
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        UPDATE AR_Users 
        SET CompanyId = @companyId 
        WHERE userId = @userId
      `);
    
    return { success: true };
  } catch (err) {
    console.error('Error updating user primary company:', err);
    throw err;
  }
}

// Funzione per ottenere le aziende associate a un utente tramite username
async function getUserCompaniesByUsername(username) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT c.CompanyId, c.Description, c.CompanyCode
        FROM AR_Users u
        JOIN AR_CompaniesUsers cu ON u.userId = cu.UserId
        JOIN AR_Companies c ON cu.CompanyId = c.CompanyId
        WHERE u.username = @username 
        AND u.userDisabled = 0
        AND c.IsActive = 1
        ORDER BY c.Description
      `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching user companies by username:', err);
    throw err;
  }
}

// Ricordati di esportare la nuova funzione nel module.exports

module.exports = {
  getUserById,
  getAllUsers,
  changePassword,
  resetPassword,
  updateUser,
  toggleUserStatus,
  addUser,
  getUserCompanies,
  getAllCompanies,
  assignUserToCompany,
  removeUserFromCompany,
  updateUserPrimaryCompany,
  getUserCompaniesByUsername,
};
