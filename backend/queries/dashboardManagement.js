const sql = require('mssql');
const config = require('../config');

/* Gestione dei gruppi */
async function getAllGroups(CompanyId) {
  const query = `
    -- Estrae i gruppi della Company
    SELECT 
        T0.*,
        COALESCE(users.JsonData, '[]') AS users
    FROM AR_Groups T0
    OUTER APPLY (
        SELECT (
            SELECT 
                TB.userId, 
                TB.username, 
                TB.firstName, 
                TB.lastName 
            FROM AR_GroupMembers TA 
            INNER JOIN AR_Users TB ON TB.userId = TA.userId 
            WHERE TA.groupId = T0.groupId 
                AND TB.userDisabled = 0
            FOR JSON AUTO
        ) AS JsonData
    ) users
    WHERE T0.disabled = 0
    AND T0.CompanyId = @CompanyId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('CompanyId', sql.Int, CompanyId)
      .query(query);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching groups:', err);
    throw err;
  }
}

async function getAllUsers(CompanyId) {
  const query = `
    -- Estrae gli utenti della Company con i loro gruppi
    SELECT 
        T0.*,
        ISNULL((
            SELECT 
                TB.groupId, 
                TB.groupName, 
                TB.description 
            FROM AR_GroupMembers TA 
            INNER JOIN AR_Groups TB ON TB.groupId = TA.groupId 
            WHERE TA.userId = T0.userId 
                AND TB.disabled = 0
            FOR JSON AUTO
        ),'[]') AS GroupListJson
    FROM AR_Users T0
    WHERE T0.CompanyId = @CompanyId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('CompanyId', sql.Int, CompanyId)
      .query(query);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching users:', err);
    throw err;
  }
}

async function updateGroup(groupId, data) {
  const { groupName, description } = data;
  const query = `
    UPDATE AR_Groups 
    SET groupName = @groupName, description = @description
    WHERE groupId = @groupId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('groupName', sql.NVarChar, groupName)
      .input('description', sql.NVarChar, description)
      .input('groupId', sql.Int, groupId)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error updating group:', err);
    throw err;
  }
}

async function assignUserToGroup(userId, groupId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('groupId', sql.Int, groupId)
      .query('INSERT INTO AR_GroupMembers (userId, groupId) VALUES (@userId, @groupId)');
  } catch (err) {
    console.error('Error assigning user to group:', err);
    throw err;
  }
}

async function removeUserFromGroup(userId, groupId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('groupId', sql.Int, groupId)
      .query('DELETE FROM AR_GroupMembers WHERE userId = @userId AND groupId = @groupId');
  } catch (err) {
    console.error('Error removing user from group:', err);
    throw err;
  }
}

async function addGroup(data) {
  const { groupName, description, userId } = data;
  const queryInsertGroup = `
    -- Estrae il CompanyId dell'utente
    DECLARE @companyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @userId), 0)
    -- Inserisce il gruppo
    INSERT INTO AR_Groups (groupName, description, disabled, CompanyId)
    VALUES (@groupName, @description, 0, @companyId)
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('groupName', sql.NVarChar, groupName)
      .input('description', sql.NVarChar, description)
      .input('userId', sql.Int, userId)
      .query(queryInsertGroup);
    return { success: true };
  } catch (err) {
    console.error('Error adding group:', err);
    throw err;
  }
}

/* Gestione delle pagine */
async function getAllPages(userId) {
  try {
    const query = `
    -- Estrae il CompanyId dell'utente
    DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @userId), 0)

    -- Ottiene tutte le pagine con informazioni sui gruppi e sui figli
    SELECT 
        T0.*,
        COALESCE(groups.JsonData, '[]') AS groups,
        (SELECT COUNT(*) FROM AR_Pages WHERE pageParent = T0.pageId) AS childCount,
        STUFF((
            SELECT ', ' + CAST(pageId AS VARCHAR(10))
            FROM AR_Pages
            WHERE pageParent = T0.pageId
            FOR XML PATH('')
        ), 1, 2, '') AS childPages
    FROM AR_Pages T0
    OUTER APPLY (
        SELECT (
            SELECT TB.groupId
            , TB.groupName
            , TB.description
            FROM AR_GroupPages TA 
            JOIN AR_Groups TB ON TB.groupId = TA.groupId
            WHERE TA.pageId = T0.pageId
            AND TB.disabled = 0
            AND TB.CompanyId = @CompanyId
            FOR JSON AUTO
        ) AS JsonData
    ) groups
    ORDER BY T0.pageLevel, T0.sequence, T0.pageName
    `;
    
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);

    // Costruisce una struttura gerarchica delle pagine
    const pages = result.recordset;
    
    // Aggiungi informazioni sull'ereditarietà
    for (const page of pages) {
      if (page.inheritPermissions && page.pageParent) {
        const parentPage = pages.find(p => p.pageId === page.pageParent);
        if (parentPage) {
          page.inheritsFrom = {
            pageId: parentPage.pageId,
            pageName: parentPage.pageName
          };
        }
      }
    }

    return pages;
  } catch (err) {
    console.error('Error fetching pages:', err);
    throw err;
  }
}

async function enableDisablePage(pageId, disabled) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    if (disabled) {
      // Per disabilitare: aggiorniamo la pagina selezionata e tutte le pagine figlie verso il basso
      const disableQuery = `
        WITH PageHierarchy AS (
          -- Pagina iniziale
          SELECT pageId, pageParent 
          FROM AR_Pages
          WHERE pageId = @pageId
          
          UNION ALL
          
          -- Ricorsione per ottenere tutte le pagine figlie e discendenti
          SELECT c.pageId, c.pageParent
          FROM AR_Pages c
          JOIN PageHierarchy p ON c.pageParent = p.pageId
        )
        -- Aggiorna lo stato di tutte le pagine trovate nella gerarchia
        UPDATE AR_Pages
        SET disabled = @disabled
        WHERE pageId IN (SELECT pageId FROM PageHierarchy)
      `;
      
      await pool.request()
        .input('disabled', sql.Bit, disabled)
        .input('pageId', sql.Int, pageId)
        .query(disableQuery);
    } else {
      // Per abilitare: prima aggiorniamo tutti i genitori verso l'alto fino alla radice
      const enableParentsQuery = `
        WITH ParentHierarchy AS (
          -- Trova il genitore diretto della pagina corrente
          SELECT p.pageId, p.pageParent 
          FROM AR_Pages p
          JOIN AR_Pages curr ON p.pageId = curr.pageParent
          WHERE curr.pageId = @pageId
          
          UNION ALL
          
          -- Ricorsione per ottenere tutti i genitori fino alla radice
          SELECT p.pageId, p.pageParent
          FROM AR_Pages p
          JOIN ParentHierarchy ph ON p.pageId = ph.pageParent
        )
        -- Abilita tutti i genitori
        UPDATE AR_Pages
        SET disabled = 0
        WHERE pageId IN (SELECT pageId FROM ParentHierarchy)
      `;
      
      await pool.request()
        .input('pageId', sql.Int, pageId)
        .query(enableParentsQuery);
      
      // Poi aggiorniamo la pagina selezionata
      const enableCurrentQuery = `
        UPDATE AR_Pages
        SET disabled = 0
        WHERE pageId = @pageId
      `;
      
      await pool.request()
        .input('pageId', sql.Int, pageId)
        .query(enableCurrentQuery);
    }
      
    return { success: true };
  } catch (err) {
    console.error('Error updating page status:', err);
    throw err;
  }
}

async function toggleInheritPermissions(pageId, inheritPermissions) {
  const query = `UPDATE AR_Pages SET inheritPermissions = @inheritPermissions WHERE pageId = @pageId`;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('inheritPermissions', sql.Bit, inheritPermissions)
      .input('pageId', sql.Int, pageId)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error updating inheritance status:', err);
    throw err;
  }
}

async function assignGroupToPage(pageId, groupId, applyToChildren = false) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Aggiungi il gruppo alla pagina principale
    await pool.request()
      .input('pageId', sql.Int, pageId)
      .input('groupId', sql.Int, groupId)
      .input('action', sql.VarChar(25), 'insert')
      .execute('AddRemoveGroupToPage');
    
    // Se richiesto, applica anche ai figli che hanno inheritPermissions = 1
    if (applyToChildren) {
      const childPagesQuery = `
        WITH PageHierarchy AS (
          SELECT pageId, pageParent, inheritPermissions
          FROM AR_Pages
          WHERE pageId = @pageId
          
          UNION ALL
          
          SELECT c.pageId, c.pageParent, c.inheritPermissions
          FROM AR_Pages c
          JOIN PageHierarchy p ON c.pageParent = p.pageId
          WHERE c.inheritPermissions = 1
        )
        SELECT pageId FROM PageHierarchy WHERE pageId != @pageId
      `;
      
      const childPages = await pool.request()
        .input('pageId', sql.Int, pageId)
        .query(childPagesQuery);
      
      // Per ogni figlio con ereditarietà attiva, aggiungi il gruppo
      for (const childPage of childPages.recordset) {
        await pool.request()
          .input('pageId', sql.Int, childPage.pageId)
          .input('groupId', sql.Int, groupId)
          .input('action', sql.VarChar(25), 'insert')
          .execute('AddRemoveGroupToPage');
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error assigning group to page:', err);
    throw err;
  }
}

async function removeGroupFromPage(pageId, groupId, applyToChildren = false) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Rimuovi il gruppo dalla pagina principale
    await pool.request()
      .input('pageId', sql.Int, pageId)
      .input('groupId', sql.Int, groupId)
      .input('action', sql.VarChar(25), 'delete')
      .execute('AddRemoveGroupToPage');
    
    // Se richiesto, applica anche ai figli che hanno inheritPermissions = 1
    if (applyToChildren) {
      const childPagesQuery = `
        WITH PageHierarchy AS (
          SELECT pageId, pageParent, inheritPermissions
          FROM AR_Pages
          WHERE pageId = @pageId
          
          UNION ALL
          
          SELECT c.pageId, c.pageParent, c.inheritPermissions
          FROM AR_Pages c
          JOIN PageHierarchy p ON c.pageParent = p.pageId
          WHERE c.inheritPermissions = 1
        )
        SELECT pageId FROM PageHierarchy WHERE pageId != @pageId
      `;
      
      const childPages = await pool.request()
        .input('pageId', sql.Int, pageId)
        .query(childPagesQuery);
      
      // Per ogni figlio con ereditarietà attiva, rimuovi il gruppo
      for (const childPage of childPages.recordset) {
        await pool.request()
          .input('pageId', sql.Int, childPage.pageId)
          .input('groupId', sql.Int, groupId)
          .input('action', sql.VarChar(25), 'delete')
          .execute('AddRemoveGroupToPage');
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error removing group from page:', err);
    throw err;
  }
}

/* Gestione canali delle notifiche */
async function getNotificationsChannels(userId) {
  try {
    const query = `
    -- Estrae il CompanyId dell'utente
    DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @userId), 0)
SELECT T0.*
		, ISNULL((	SELECT	TA.userId
							, TB.firstName
							, TB.lastName
							, ISNULL(TB.role,'') AS role
							, TC.Description AS companyName
					FROM	AR_NotificationCategoryUsers TA 
					JOIN	AR_Users TB ON TB.userId = TA.userId 
					JOIN 	AR_Companies TC ON TC.CompanyId = TB.CompanyId
					WHERE TA.notificationCategoryId = T0.notificationCategoryId AND TB.userDisabled = 0 
					FOR JSON PATH
					), '[]') AS membersJson
FROM	AR_NotificationCategory (NOLOCK) T0
WHERE	T0.CompanyId = @CompanyId OR T0.intercompany = 1
    `;
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error('Error fetching notification channels:', err);
    throw err;
  }
}

async function addNotificationChannel(data, userId) {
  /* Dati di input: name, description, hexColor (esempio #000000), defaultResponseOptionId, defaultTitle, menuType */
  const { name, description, hexColor, defaultResponseOptionId, defaultTitle, menuType, intercompany } = data;
  const query = `
    DECLARE @CompanyId INT = ISNULL((SELECT CompanyId FROM AR_Users WHERE userId = @userId), 0)
    INSERT INTO AR_NotificationCategory (name, description, hexColor, defaultResponseOptionId, defaultTitle, menuType, CompanyId, intercompany)
    VALUES (@name, @description, @hexColor, @defaultResponseOptionId, @defaultTitle, @menuType, @CompanyId, @intercompany)
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('name', sql.NVarChar, name || '')
      .input('description', sql.NVarChar, description || '')
      .input('hexColor', sql.NVarChar, hexColor || '#000000')
      .input('defaultResponseOptionId', sql.Int, defaultResponseOptionId || 3)
      .input('defaultTitle', sql.NVarChar, defaultTitle || '')
      .input('menuType', sql.NVarChar, menuType || '')
      .input('userId', sql.Int, userId)
      .input('intercompany', sql.Bit, intercompany || 0)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error adding notification channel:', err);
    throw err;
  }
}

async function updateNotificationChannel(data) {
  /* Dati di input: notificationCategoryId, name, description, hexColor, defaultResponseOptionId, defaultTitle, menuType */
  const { notificationCategoryId, name, description, hexColor, defaultResponseOptionId, defaultTitle, menuType } = data;
  const query = `
    UPDATE AR_NotificationCategory
    SET   name = @name
          , description = @description
          , hexColor = @hexColor
          , defaultResponseOptionId = @defaultResponseOptionId
          , defaultTitle = @defaultTitle
          , menuType = @menuType
          , intercompany = @intercompany
    WHERE notificationCategoryId = @notificationCategoryId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationCategoryId', sql.Int, notificationCategoryId)
      .input('name', sql.NVarChar, name || '')
      .input('description', sql.NVarChar, description || '')
      .input('hexColor', sql.NVarChar, hexColor || '#000000')
      .input('defaultResponseOptionId', sql.Int, defaultResponseOptionId || 3)
      .input('defaultTitle', sql.NVarChar, defaultTitle || '')
      .input('menuType', sql.NVarChar, menuType || '')
      .input('intercompany', sql.Bit, data.intercompany || 0)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error updating notification channel:', err);
    throw err;
  }
}

async function addUserToChannel(userId, notificationCategoryId) {
  const query = `
    INSERT INTO AR_NotificationCategoryUsers (notificationCategoryId, userId)
    VALUES (@notificationCategoryId, @userId)
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationCategoryId', sql.Int, notificationCategoryId)
      .input('userId', sql.Int, userId)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error adding user to notification channel:', err);
    throw err;
  }
}

async function removeUserFromChannel(userId, notificationCategoryId) {
  const query = `
    DELETE FROM AR_NotificationCategoryUsers
    WHERE notificationCategoryId = @notificationCategoryId AND userId = @userId
  `;
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationCategoryId', sql.Int, notificationCategoryId)
      .input('userId', sql.Int, userId)
      .query(query);
    return { success: true };
  } catch (err) {
    console.error('Error removing user from notification channel:', err);
    throw err;
  }
}

module.exports = {
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
};