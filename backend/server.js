// Utente ADMIN
// Password: Admin123!
// $2b$10$0eWgveCpJzZx/3pM7sum9OUJGf3Jvl/CpisSacnQbWXAqKO.KIdQq  -  salt 10
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const uploadPath = path.join(__dirname, 'uploads');

const isProduction = process.env.NODE_ENV === 'production';

console.log('=== ENVIRONMENT VARIABLES ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('PORT:', process.env.PORT);
console.log('===========================');

// Configurazione CORS aggiornata
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost',     // Frontend in produzione
      'http://localhost:80',  // Frontend in produzione (esplicito)
      'http://localhost:5174', // Frontend in sviluppo
      'http://10.0.0.129:5174', // Frontend in sviluppo
    ];
    
    // Permetti richieste senza origin (es. da Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
};

// Test connessione database
async function testDatabaseConnection() {
  try {
    console.log('=== DATABASE CONNECTION ATTEMPT ===');
    console.log('Using configuration:', {
      user: config.database.user,
      server: config.database.server,
      database: config.database.database,
      port: process.env.DB_PORT,
    });

    let pool = await sql.connect(config.database);
    let result = await pool.request().query('SELECT DB_NAME() as currentDatabase');
    console.log('Connected to database:', result.recordset[0].currentDatabase);
    console.log('=== CONNECTION SUCCESSFUL ===');
    return true;
  } catch (err) {
    console.error('=== DATABASE CONNECTION ERROR ===');
    console.error(err);
    console.error('===============================');
    return false;
  }
}

// Crea le directory necessarie per gli upload
async function createRequiredDirectories() {
  const dirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'uploads/projects'),
      path.join(__dirname, 'uploads/projects/tasks'),
      path.join(__dirname, 'uploads/notifications'),
      path.join(__dirname, 'temp'),
      path.join(__dirname, 'temp/uploads')
  ];

  for (const dir of dirs) {
      await fs.ensureDir(dir);
      console.log(`Directory created/verified: ${dir}`);
  }
  
  // Set proper permissions
  const uploadDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'temp')
  ];
  
  for (const dir of uploadDirs) {
      try {
          await fs.chmod(dir, 0o777);
          console.log(`Permissions set for: ${dir}`);
      } catch (err) {
          console.warn(`Warning: Could not set permissions for ${dir}: ${err.message}`);
      }
  }
}

const authenticateToken = require('./authenticateToken');

// Routes
const companyRoutes = require('./routes/companyRoutes');
const userManagementRoutes = require('./routes/userRoutes');
const notificationsManagementRoutes = require('./routes/notificationsRoutes');
const dashboardManagementRoutes = require('./routes/dashboardRoutes');
const custSuppManagementRoutes = require('./routes/custSuppRoutes');
const printerRoutes = require('./routes/printerRoutes');
const categoryManagementRoutes = require('./routes/categoryManagementRoutes');
const templateManagementRoutes = require('./routes/templateManagementRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const projectManagementRoutes = require('./routes/projectManagementRoutes');
const projectCustomersRoutes = require('./routes/projectCustomersRoutes');
const projectArticlesRoutes = require('./routes/projectArticlesRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');

const groupRoutes = require('./routes/groupRoutes');
const aiRoutes = require('./routes/aiRoutes');
const itemAttachmentRoutes = require('./routes/itemAttachmentRoutes');
const documentLinkRoutes = require('./routes/documentLinkRoutes');

const app = express();

// Configurazione Multer per upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      // Ensure the directory exists
      const uploadDir = path.join(__dirname, 'temp', 'uploads');
      fs.ensureDir(uploadDir)
        .then(() => {
            cb(null, uploadDir);
        })
        .catch(err => {
            console.error(`Error creating temp upload directory: ${err}`);
            cb(err);
        });
  },
  filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware per CORS
app.use(cors(corsOptions));

// Middleware per headers CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin(origin, () => {})) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control', 'Pragma');
  next();
});

// Configurazione path statici
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', cors(), express.static(uploadPath));

// Middleware per il parsing del corpo della richiesta - applicato DOPO le routes di upload
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// IMPORTANTE: Registra prima le routes che gestiscono upload di file
app.use('/api', itemAttachmentRoutes);
app.use('/api', attachmentRoutes);

// Registrazione delle altre routes
app.use('/api', companyRoutes);
app.use('/api', userManagementRoutes);
app.use('/api', notificationsManagementRoutes);
app.use('/api', dashboardManagementRoutes);
app.use('/api', custSuppManagementRoutes);
app.use('/api/printer', printerRoutes);
app.use('/api', categoryManagementRoutes);
app.use('/api', templateManagementRoutes);
app.use('/api', timeTrackingRoutes);
app.use('/api', projectManagementRoutes);
app.use('/api', projectCustomersRoutes);
app.use('/api', projectArticlesRoutes);
app.use('/api', groupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', documentLinkRoutes);

// Endpoint per servire i file uploadati
app.get('/api/uploads/*', (req, res) => {
  try {
    const filePath = req.path.replace('/api/uploads/', '');
    const fullPath = path.join(uploadPath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File not found');
    }
    
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Error serving file');
  }
});

// Route per il login
app.post('/api/login', async (req, res) => {
  const { username, password, companyId } = req.body;
  
  try {
    let pool = await sql.connect(config.database);
    
    // Prima, verifica se l'utente esiste e ottieni le aziende associate
    let userQuery = `
      SELECT 
        U.*,
        (
          SELECT STRING_AGG(CAST(CompanyId AS VARCHAR), ',') 
          FROM AR_CompaniesUsers 
          WHERE UserId = U.userId
        ) AS AssociatedCompanies,
        (
          SELECT T2.groupName
          FROM AR_Groups T2
          JOIN AR_GroupMembers T3 ON T3.groupId = T2.groupId
          WHERE T3.userId = U.userId
          FOR JSON AUTO
        ) AS groups
      FROM 
        AR_Users U
      WHERE 
        U.username = @username
      AND 
        U.userDisabled = 0
      AND 
        (U.LicenseExpiration = '1799-12-31' OR U.LicenseExpiration >= CAST(GETDATE() AS DATE))
    `;
    
    let userResult = await pool.request()
      .input('username', sql.VarChar, username)
      .query(userQuery);
    
    const user = userResult.recordset[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Username o password non validi' });
    }
    
    // Verifica password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Username o password non validi' });
    }
    
    // Se è stato specificato un companyId, verifica che l'utente sia associato
    if (companyId) {
      // Converti la stringa di aziende associate in array
      const associatedCompanies = user.AssociatedCompanies ? 
        user.AssociatedCompanies.split(',').map(id => parseInt(id)) : [];
      
      if (!associatedCompanies.includes(parseInt(companyId))) {
        return res.status(401).json({ message: 'Utente non associato a questa azienda' });
      }
      
      // Verifica che l'azienda sia attiva
      const companyQuery = `
        SELECT CompanyId, Description, IsActive 
        FROM AR_Companies 
        WHERE CompanyId = @companyId 
        AND IsActive = 1
        AND (ExpirationDate = '1799-12-31' OR ExpirationDate >= CAST(GETDATE() AS DATE))
      `;
      
      const companyResult = await pool.request()
        .input('companyId', sql.Int, companyId)
        .query(companyQuery);
      
      if (companyResult.recordset.length === 0) {
        return res.status(401).json({ message: 'Azienda non attiva o scaduta' });
      }
      
      // Aggiorna l'azienda attiva dell'utente
      await pool.request()
        .input('userId', sql.Int, user.userId)
        .input('companyId', sql.Int, companyId)
        .query('UPDATE AR_Users SET CompanyId = @companyId WHERE userId = @userId');
      
      // Aggiorna anche l'utente locale
      user.CompanyId = parseInt(companyId);
      user.CompanyName = companyResult.recordset[0].Description;
    }
    
    // Genera token JWT
    const accessToken = jwt.sign(
      { 
        UserId: user.userId,
        username: user.username,
        role: user.role,
        CompanyId: user.CompanyId
      },
      config.jwt.secret,
      { 
        expiresIn: user.sessionDurationMinutes ? 
          `${user.sessionDurationMinutes}m` : '8h' 
      }
    );
    
    // Aggiorna lastOnline
    await pool.request()
      .input('userId', sql.Int, user.userId)
      .query('UPDATE AR_Users SET lastOnline = GETDATE() WHERE userId = @userId');
    
    // Rimuovi campi sensibili
    const { password: pwd, salt, resetToken, resetTokenExpiry, AssociatedCompanies, ...safeUser } = user;
    
    res.json({ 
      accessToken,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      message: 'Errore del server durante il login'
    });
  }
});

// Route per informazioni sul database
app.get('/api/dbinfo', async (req, res) => {
  try {
    let pool = await sql.connect(config.database);
    const result = await pool.request().query(`
      SELECT 
        DB_NAME() as currentDatabase,
        @@SERVERNAME as serverName,
        @@VERSION as sqlVersion
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error getting DB info:', err);
    res.status(500).send('Error getting database information');
  }
});

// Route per ottenere l'utente corrente
app.get('/api/currentUser', authenticateToken, async (req, res) => {
  const userId = req.user.UserId;
  const query = `
  SELECT 
    T0.userId, 
    T0.username, 
    T0.email, 
    T0.CompanyId,
    (
        SELECT T1.groupName
        FROM AR_Groups T1
        JOIN AR_GroupMembers T2 ON T2.groupId = T1.groupId
        WHERE T2.userId = T0.userId
        FOR JSON AUTO
    ) AS groups
  FROM 
    AR_Users T0
  WHERE 
    T0.userId = @userId
  `;
  
  try {
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);
    const user = result.recordset[0];
    if (user) {
      res.json({ user });
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Route per il menu
app.get('/api/menu', authenticateToken, async (req, res) => {
  const userId = req.user.UserId;
  const query = `
    SELECT DISTINCT 
      T1.pageId,
      T2.pageName,
      T2.pageParent,
      T2.pageLevel,
      T2.pageRoute,
      T2.pageComponent,
      T2.sequence
    FROM AR_GroupMembers T0
    JOIN AR_GroupPages T1 ON T0.groupId = T1.groupId
    JOIN AR_Pages T2 ON T2.pageId = T1.pageId
    JOIN AR_Groups T3 ON T3.groupId = T0.groupId
    WHERE T0.userId = @userId 
    AND   T2.disabled = 0 
    AND   T3.disabled = 0
    ORDER BY T2.pageLevel, T2.pageParent, T2.sequence, T2.pageRoute, T2.pageName, T2.pageComponent
  `;
  try {
    let pool = await sql.connect(config.database);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(query);
    const pages = result.recordset;
    res.json(pages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Serve frontend in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Inizializza il servizio di storage
const FileService = require('./services/fileService');
const fileService = new FileService();

// Inizializzazione del server
async function initializeServer() {
    try {
        // Inizializza lo storage prima di tutto
        await fileService._initializeStorage();
        console.log('Storage initialized successfully');

        await createRequiredDirectories();
        console.log('Upload directories created successfully');

        await testDatabaseConnection();

        app.listen(config.server.port, '0.0.0.0', () => {
            console.log(`Server running on port ${config.server.port}`);
            console.log(`Server accessible at http://localhost:${config.server.port}`);
        });
    } catch (err) {
        console.error('Error initializing server:', err);
        process.exit(1);
    }
}

// Avvio del server
initializeServer();