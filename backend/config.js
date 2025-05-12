//backend config.js
require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    apiBaseUrl: process.env.API_BASE_URL,
    frontendUrl: process.env.FRONTEND_URL
  },
  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,  
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      enableArithAbort: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  },
  jwt: {
    secret: process.env.ACCESS_TOKEN_SECRET
  },
  printer: {
    ip: process.env.PRINTER_IP || '',
    testMode: process.env.PRINTER_TEST_MODE === 'true'
  },
  smtp: {  
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'USERNAME',
    password: process.env.SMTP_PASSWORD || 'PASSWORD',
    from: process.env.SMTP_FROM || 'pippo@mail.it'
  },
  // sezione per le API di intelligenza artificiale
  ai: {
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      apiVersion: '2023-06-01'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },
    // Impostazione per il fallback automatico
    fallbackStrategy: process.env.AI_FALLBACK_STRATEGY || 'claude-only' // Opzioni: 'claude-only', 'openai-only', 'claude-then-openai'
  },
  // Configurazione specifica per riepiloghi di conversazione
  summaryOptions: {
    maxTextLength: parseInt(process.env.AI_MAX_TEXT_LENGTH || '10000'),
    maxPoints: parseInt(process.env.AI_MAX_SUMMARY_POINTS || '5'),
    minPointLength: parseInt(process.env.AI_MIN_POINT_LENGTH || '10')
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || path.join(__dirname, 'uploads'),
    remotePath: process.env.REMOTE_STORAGE_PATH || '//SERVER_IP/share_name',
    remoteType: process.env.REMOTE_STORAGE_TYPE || 'mounted', // 'mounted', 'smb', 'nfs'
    smb: {
      path: process.env.SMB_PATH,
      domain: process.env.STORAGE_DOMAIN,
      username: process.env.STORAGE_USERNAME,
      password: process.env.STORAGE_PASSWORD
    },
    nfs: {
      server: process.env.NFS_SERVER,
      path: process.env.NFS_PATH
    }
  },
};

console.log('\n=== CONFIG.JS LOADED ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Database Name:', process.env.DB_NAME);
console.log('Server:', process.env.DB_SERVER);
console.log('=== END CONFIG.JS ===\n');

module.exports = config;