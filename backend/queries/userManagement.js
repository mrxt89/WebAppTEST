const sql = require('mssql');
const bcrypt = require('bcrypt');
const config = require('../config');

async function getUserById(userId) {
  try {
    console.log(`[USER_MANAGEMENT] Getting user by ID: ${userId}`);
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM AR_Users WHERE userId = @userId');
    
    if (!result.recordset[0]) {
      console.log(`[USER_MANAGEMENT] User not found: ${userId}`);
    } else {
      console.log(`[USER_MANAGEMENT] User found: ${result.recordset[0].username}`);
    }
    
    return result.recordset[0];
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error fetching user:', err);
    throw err;
  }
}

async function getAllUsers(userId) {
  console.log(`[USER_MANAGEMENT] Getting all users for admin: ${userId}`);
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
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);

    const users = JSON.parse(result.recordset[0]['JSON_F52E2B61-18A1-11d1-B105-00805F49916B']); // Parse JSON
    console.log(`[USER_MANAGEMENT] Retrieved ${users.length} users`);
    return users;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error fetching users:', err);
    throw err;
  }
}

async function toggleUserStatus(userId, userDisabled) {
  console.log(`[USER_MANAGEMENT] Toggling user status: ${userId} -> ${userDisabled ? 'disabled' : 'enabled'}`);
  const query = 'UPDATE AR_Users SET userDisabled = @userDisabled WHERE userId = @userId';
  try {
    let pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('userDisabled', sql.Bit, userDisabled)
      .query(query);
    
    console.log(`[USER_MANAGEMENT] User status updated. Rows affected: ${result.rowsAffected[0]}`);
    return true;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error updating user status:', err);
    throw err;
  }
}


async function changePassword(userId, currentPassword, newPassword) {
  console.log(`[USER_MANAGEMENT] Changing password for user: ${userId}`);
  const query = 'SELECT * FROM AR_Users WHERE userId = @userId';
  try {
    let pool = await sql.connect(config.database);
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
      console.log(`[USER_MANAGEMENT] Password changed successfully for user: ${userId}`);
      return true;
    } else {
      console.log(`[USER_MANAGEMENT] Password change failed - invalid current password for user: ${userId}`);
      return false;
    }
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error changing password:', err);
    throw err;
  }
}

async function resetPassword(userId, newPassword) {
  console.log(`[USER_MANAGEMENT] Resetting password for user: ${userId}`);
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE AR_Users SET password = @password, salt = \'10\' WHERE userId = @userId';
    let pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('password', sql.NVarChar, hashedPassword)
      .input('userId', sql.Int, userId)
      .query(query);
    
    console.log(`[USER_MANAGEMENT] Password reset successfully. Rows affected: ${result.rowsAffected[0]}`);
    return true;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error resetting password:', err);
    throw err;
  }
}

async function updateUser(data) {
  console.log(`[USER_MANAGEMENT] Updating user: ${data.userId}`, { email: data.email, firstName: data.firstName, lastName: data.lastName });
  const { userId, username, email, firstName, lastName, phoneNumber, address, role } = data;
  const query = `
    UPDATE AR_Users 
    SET email = @Email, firstName = @firstName, lastName = @lastName, phoneNumber = @phoneNumber, address = @address, role = CASE WHEN @role = '' THEN role ELSE @role END
    WHERE userId = @userId
  `;
  try {
    let pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('phoneNumber', sql.VarChar, phoneNumber ? phoneNumber : '')
      .input('userId', sql.Int, userId)
      .input('address', sql.VarChar, address ? address : '')
      .input('role', sql.VarChar, role)
      .query(query);
    
    console.log(`[USER_MANAGEMENT] User updated successfully. Rows affected: ${result.rowsAffected[0]}`);
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error updating user:', err);
    throw err;
  }
}

async function addUser(data) {
  console.log(`[USER_MANAGEMENT] Adding new user: ${data.username}`, { email: data.email, firstName: data.firstName, lastName: data.lastName });
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
    let pool = await sql.connect(config.database);
    const companyResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT CompanyId FROM AR_Users WHERE userId = @userId');
    
    if (companyResult.recordset.length > 0) {
      defaultCompanyId = companyResult.recordset[0].CompanyId;
      console.log(`[USER_MANAGEMENT] Default company ID: ${defaultCompanyId}`);
    }
  } catch (error) {
    console.error('[USER_MANAGEMENT] Error getting default CompanyId:', error);
  }
  
  // Utilizza la prima azienda selezionata o quella di default
  const primaryCompanyId = companies && companies.length > 0 ? companies[0] : defaultCompanyId;
  console.log(`[USER_MANAGEMENT] Primary company ID: ${primaryCompanyId}`);
  
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
    let pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(queryCheckUsername);
      
    if (result.recordset[0].count > 0) {
      console.log(`[USER_MANAGEMENT] Username already exists: ${username}`);
      return { success: false, message: 'Username già in uso' };
    }
    
    console.log(`[USER_MANAGEMENT] Creating new user with company ID: ${primaryCompanyId}`);
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
    console.log(`[USER_MANAGEMENT] New user created with ID: ${newUserId}`);
    
    // Associa l'utente alle aziende selezionate
    if (companies && companies.length > 0) {
      console.log(`[USER_MANAGEMENT] Associating user with ${companies.length} companies`);
      for (const companyId of companies) {
        await assignUserToCompany(newUserId, companyId);
      }
    } else if (defaultCompanyId > 0) {
      // Se non sono state selezionate aziende, associa l'utente all'azienda di default
      console.log(`[USER_MANAGEMENT] Associating user with default company: ${defaultCompanyId}`);
      await assignUserToCompany(newUserId, defaultCompanyId);
    }
    
    console.log(`[USER_MANAGEMENT] User creation completed successfully`);
    return { success: true };
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error adding user:', err);
    throw err;
  }
}



// Funzione per ottenere le aziende associate a un utente
async function getUserCompanies(userId) {
  console.log(`[USER_MANAGEMENT] Getting companies for user: ${userId}`);
  try {
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT c.CompanyId, c.Description, c.CompanyCode, ISNULL(cu.ERPUserId, 0) AS ERPUserId
        FROM AR_CompaniesUsers cu
        JOIN AR_Companies c ON cu.CompanyId = c.CompanyId
        WHERE cu.UserId = @userId AND c.IsActive = 1
        ORDER BY c.Description
      `);
    console.log(`[USER_MANAGEMENT] Found ${result.recordset.length} companies for user ${userId}`);
    return result.recordset;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error fetching user companies:', err);
    throw err;
  }
}

// Funzione per ottenere tutte le aziende disponibili
async function getAllCompanies() {
  console.log(`[USER_MANAGEMENT] Getting all active companies`);
  try {
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .query(`
        SELECT CompanyId, CompanyCode, Description, Email, IsActive
        FROM AR_Companies 
        WHERE IsActive = 1
        ORDER BY Description
      `);
    console.log(`[USER_MANAGEMENT] Found ${result.recordset.length} active companies`);
    return result.recordset;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error fetching companies:', err);
    throw err;
  }
}

// Funzione per associare un utente a un'azienda
async function assignUserToCompany(userId, companyId) {
  console.log(`[USER_MANAGEMENT] Assigning user ${userId} to company ${companyId}`);
  try {
    let pool = await sql.connect(config.database);
    
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
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('companyId', sql.Int, companyId)
        .query(`
          INSERT INTO AR_CompaniesUsers (UserId, CompanyId)
          VALUES (@userId, @companyId)
        `);
      console.log(`[USER_MANAGEMENT] User-company association created. Rows affected: ${result.rowsAffected[0]}`);
    } else {
      console.log(`[USER_MANAGEMENT] User-company association already exists`);
    }
    
    return true;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error assigning user to company:', err);
    throw err;
  }
}

// Funzione per rimuovere l'associazione di un utente da un'azienda
async function removeUserFromCompany(userId, companyId) {
  console.log(`[USER_MANAGEMENT] Removing user ${userId} from company ${companyId}`);
  try {
    let pool = await sql.connect(config.database);
    
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
      console.log(`[USER_MANAGEMENT] Cannot remove user from company - user must be associated with at least one company`);
      return { success: false, message: 'L\'utente deve essere associato ad almeno un\'azienda' };
    }
    
    // Rimuovi l'associazione
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        DELETE FROM AR_CompaniesUsers 
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    console.log(`[USER_MANAGEMENT] User-company association removed. Rows affected: ${result.rowsAffected[0]}`);
    return { success: true };
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error removing user from company:', err);
    throw err;
  }
}

// Funzione per aggiornare l'azienda principale di un utente (CompanyId in AR_Users)
async function updateUserPrimaryCompany(userId, companyId) {
  console.log(`[USER_MANAGEMENT] Updating primary company for user ${userId} to ${companyId}`);
  try {
    let pool = await sql.connect(config.database);
    
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
      console.log(`[USER_MANAGEMENT] User is not associated with company ${companyId}`);
      return { success: false, message: 'L\'utente non è associato a questa azienda' };
    }
    
    // Aggiorna l'azienda principale dell'utente
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        UPDATE AR_Users 
        SET CompanyId = @companyId 
        WHERE userId = @userId
      `);
    
    console.log(`[USER_MANAGEMENT] Primary company updated. Rows affected: ${result.rowsAffected[0]}`);
    return { success: true };
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error updating user primary company:', err);
    throw err;
  }
}

// Funzione per ottenere le aziende associate a un utente tramite username
async function getUserCompaniesByUsername(username) {
  console.log(`[USER_MANAGEMENT] Getting companies for username: ${username}`);
  try {
    let pool = await sql.connect(config.database);
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
    console.log(`[USER_MANAGEMENT] Found ${result.recordset.length} companies for username ${username}`);
    return result.recordset;
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error fetching user companies by username:', err);
    throw err;
  }
}

// Funzione per aggiornare ERPUserId di un utente per una specifica azienda
async function updateUserERPUserId(userId, companyId, erpUserId) {
  console.log(`[USER_MANAGEMENT] Updating ERPUserId for user ${userId} in company ${companyId} to ${erpUserId}`);
  try {
    let pool = await sql.connect(config.database);
    
    // Verifica se l'associazione esiste
    const checkResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count 
        FROM AR_CompaniesUsers 
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    if (checkResult.recordset[0].count === 0) {
      return { success: false, message: 'Utente non associato a questa azienda' };
    }
    
    // Aggiorna o inserisce ERPUserId
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('companyId', sql.Int, companyId)
      .input('erpUserId', sql.Int, erpUserId || null)
      .query(`
        UPDATE AR_CompaniesUsers 
        SET ERPUserId = @erpUserId
        WHERE UserId = @userId AND CompanyId = @companyId
      `);
    
    console.log(`[USER_MANAGEMENT] ERPUserId updated. Rows affected: ${result.rowsAffected[0]}`);
    return { success: true };
  } catch (err) {
    console.error('[USER_MANAGEMENT] Error updating ERPUserId:', err);
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
  updateUserERPUserId,
};
