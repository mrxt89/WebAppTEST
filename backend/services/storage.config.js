const path = require('path');
const fs = require('fs-extra');
const smbClient = require('smb2'); // Per connessioni SMB/CIFS
const sql = require('mssql');
const config = require('../config');

/**
 * Modulo di configurazione avanzata per la gestione dei file
 * Supporta storage locale e remoto con diverse modalità di connessione
 */
class StorageConfig {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.smbConnections = {};
    this.mountpoints = {};
  }

  /**
   * Inizializza le connessioni necessarie per lo storage
   */
  async initialize() {
    if (this.initialized) return;
    
    if (this.config.storage.type === 'remote') {
      await this._setupRemoteConnections();
    } else {
      await this._setupLocalStorage();
    }
    
    // Crea le directory per tutte le companies
    await this._setupCompanyDirectories();
    
    this.initialized = true;
    console.log(`Storage system initialized in ${this.config.storage.type} mode`);
  }

  /**
   * Recupera tutte le companies attive dal database e crea le relative directory
   */
  async _setupCompanyDirectories() {
    try {
      console.log('Setting up company directories...');
      
      // Connetti al database
      let pool = await sql.connect(this.config.database);
      
      // Ottieni tutte le companies attive
      const result = await pool.request()
        .query('SELECT CompanyId FROM AR_Companies WHERE IsActive = 1');
      
      const companies = result.recordset;
      console.log(`Found ${companies.length} active companies`);
      
      // Per ogni company, crea le directory necessarie
      const basePath = this.getBasePath();
      const companiesDir = path.join(basePath, 'Companies');
      await fs.ensureDir(companiesDir);
      
      // Definisci i tipi di documenti che potrebbero avere allegati
      const docTypes = ['itemCode', 'orders', 'invoices', 'clients', 'suppliers', 'ddt'];
      
      for (const company of companies) {
        const companyId = company.CompanyId;
        const companyDir = path.join(companiesDir, companyId.toString());
        await fs.ensureDir(companyDir);
        
        console.log(`Creating directories for Company ID: ${companyId}`);
        
        // Crea sottocartelle per i vari tipi di documenti
        for (const docType of docTypes) {
          await fs.ensureDir(path.join(companyDir, docType));
        }
      }
      
      console.log('Company directories setup completed');
    } catch (error) {
      console.error('Error setting up company directories:', error);
      // Non facciamo fallire l'inizializzazione per questo errore,
      // le directory verranno create on-demand durante l'uso
    }
  }

  /**
   * Configura lo storage locale
   */
  async _setupLocalStorage() {
    const baseDir = this.config.storage.localPath;
    await fs.ensureDir(baseDir);
    
    // Crea tutte le sottocartelle principali necessarie
    const subDirs = [
      'projects',
      'projects/tasks',
      'notifications',
      'Companies',
      'temp',
      'temp/uploads'
    ];
    
    for (const dir of subDirs) {
      await fs.ensureDir(path.join(baseDir, dir));
    }
    
    console.log(`Local storage base directories created at ${baseDir}`);
  }

  /**
   * Configura le connessioni per lo storage remoto
   */
  async _setupRemoteConnections() {
    const type = this.config.storage.remoteType || 'smb';
    
    if (type === 'smb') {
      await this._setupSMBConnection();
    } else if (type === 'nfs') {
      await this._setupNFSConnection();
    } else if (type === 'mounted') {
      // Il filesystem remoto è già montato, verifica solo che sia accessibile
      await this._verifyMountedPath();
    }
  }

  /**
   * Configura una connessione SMB
   */
  async _setupSMBConnection() {
    const smb = this.config.storage.smb;
    
    if (!smb) {
      throw new Error('SMB configuration missing');
    }
    
    // Converti il percorso UNC in componenti
    // esempio: //SERVER/share/folder
    const uncMatch = smb.path.match(/^\/\/([^\/]+)\/([^\/]+)(?:\/(.*))?$/);
    if (!uncMatch) {
      throw new Error(`Invalid SMB path: ${smb.path}`);
    }
    
    const [, server, share, folder = ''] = uncMatch;
    
    try {
      // Crea una connessione SMB
      const connection = new smbClient({
        share: `\\\\${server}\\${share}`,
        domain: smb.domain || '',
        username: smb.username,
        password: smb.password
      });
      
      // Verifica che la connessione funzioni
      await new Promise((resolve, reject) => {
        connection.exists(folder || '.', (err, exists) => {
          if (err) return reject(err);
          if (!exists) {
            // Se la cartella non esiste, prova a crearla
            connection.mkdir(folder || '.', (err) => {
              if (err) return reject(err);
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
      
      // Salva la connessione per uso futuro
      this.smbConnections.default = connection;
      console.log(`SMB connection established to ${server}\\${share}\\${folder}`);
    } catch (error) {
      console.error('SMB connection failed:', error);
      throw error;
    }
  }

  /**
   * Configura una connessione NFS
   */
  async _setupNFSConnection() {
    // Implementazione per NFS
    // Questo richiederebbe tipicamente una libreria specifica per NFS
    // O più comunemente, il percorso NFS sarebbe già montato nel sistema operativo
    console.log('NFS setup would be implemented here');
    this._verifyMountedPath();
  }

  /**
   * Verifica che un percorso remoto già montato sia accessibile
   */
  async _verifyMountedPath() {
    const remotePath = this.config.storage.remotePath;
    
    try {
      await fs.access(remotePath, fs.constants.R_OK | fs.constants.W_OK);
      console.log(`Remote path verified: ${remotePath}`);
      
      // Crea sottocartelle necessarie
      const subDirs = [
        'projects',
        'projects/tasks',
        'notifications',
        'Companies',
        'temp',
        'temp/uploads'
      ];
      
      for (const dir of subDirs) {
        await fs.ensureDir(path.join(remotePath, dir));
      }
      
    } catch (error) {
      console.error(`Remote path not accessible: ${remotePath}`, error);
      throw new Error(`Remote storage path not accessible: ${remotePath}`);
    }
  }

  /**
   * Ottiene il percorso base per lo storage
   */
  getBasePath() {
    if (this.config.storage.type === 'local') {
      return this.config.storage.localPath;
    }
    
    return this.config.storage.remotePath;
  }

  /**
   * Crea un file nello storage
   * @param {string} filePath - Percorso relativo del file
   * @param {Buffer|string} content - Contenuto del file
   * @returns {Promise<void>}
   */
  async createFile(filePath, content) {
    if (this.config.storage.type === 'local' || this.config.storage.remoteType === 'mounted') {
      const fullPath = path.join(this.getBasePath(), filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    } else if (this.config.storage.remoteType === 'smb' && this.smbConnections.default) {
      // Implementa qui la scrittura via SMB
      // Esempio semplificato
      const connection = this.smbConnections.default;
      // Converti il percorso da stile UNIX a stile Windows
      const smbPath = filePath.replace(/\//g, '\\');
      
      // Assicurati che la directory esista
      const dirPath = path.dirname(smbPath);
      await new Promise((resolve, reject) => {
        connection.mkdir(dirPath, (err) => {
          // Ignora l'errore se la directory esiste già
          resolve();
        });
      });
      
      // Scrivi il file
      await new Promise((resolve, reject) => {
        connection.writeFile(smbPath, content, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
  }

  /**
   * Legge un file dallo storage
   * @param {string} filePath - Percorso relativo del file
   * @returns {Promise<Buffer>} - Contenuto del file
   */
  async readFile(filePath) {
    if (this.config.storage.type === 'local' || this.config.storage.remoteType === 'mounted') {
      const fullPath = path.join(this.getBasePath(), filePath);
      return fs.readFile(fullPath);
    } else if (this.config.storage.remoteType === 'smb' && this.smbConnections.default) {
      // Implementa qui la lettura via SMB
      const connection = this.smbConnections.default;
      // Converti il percorso da stile UNIX a stile Windows
      const smbPath = filePath.replace(/\//g, '\\');
      
      return new Promise((resolve, reject) => {
        connection.readFile(smbPath, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
    }
    
    throw new Error(`Cannot read file from current storage type: ${this.config.storage.type}`);
  }

  /**
   * Crea un flusso di lettura per un file
   * @param {string} filePath - Percorso relativo del file
   * @returns {ReadStream} - Stream di lettura
   */
  createReadStream(filePath) {
    if (this.config.storage.type === 'local' || this.config.storage.remoteType === 'mounted') {
      const fullPath = path.join(this.getBasePath(), filePath);
      return fs.createReadStream(fullPath);
    } else if (this.config.storage.remoteType === 'smb' && this.smbConnections.default) {
      // Implementa qui il createReadStream via SMB
      const connection = this.smbConnections.default;
      // Converti il percorso da stile UNIX a stile Windows
      const smbPath = filePath.replace(/\//g, '\\');
      
      return connection.createReadStream(smbPath);
    }
    
    throw new Error(`Cannot create read stream for current storage type: ${this.config.storage.type}`);
  }

  /**
   * Elimina un file dallo storage
   * @param {string} filePath - Percorso relativo del file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    if (this.config.storage.type === 'local' || this.config.storage.remoteType === 'mounted') {
      const fullPath = path.join(this.getBasePath(), filePath);
      return fs.unlink(fullPath);
    } else if (this.config.storage.remoteType === 'smb' && this.smbConnections.default) {
      // Implementa qui la cancellazione via SMB
      const connection = this.smbConnections.default;
      // Converti il percorso da stile UNIX a stile Windows
      const smbPath = filePath.replace(/\//g, '\\');
      
      return new Promise((resolve, reject) => {
        connection.unlink(smbPath, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
    
    throw new Error(`Cannot delete file from current storage type: ${this.config.storage.type}`);
  }

  /**
   * Crea una directory nello storage se non esiste
   * @param {string} dirPath - Percorso relativo della directory
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    if (this.config.storage.type === 'local' || this.config.storage.remoteType === 'mounted') {
      const fullPath = path.join(this.getBasePath(), dirPath);
      return fs.ensureDir(fullPath);
    } else if (this.config.storage.remoteType === 'smb' && this.smbConnections.default) {
      // Implementa qui la creazione della directory via SMB
      const connection = this.smbConnections.default;
      // Converti il percorso da stile UNIX a stile Windows
      const smbPath = dirPath.replace(/\//g, '\\');
      
      return new Promise((resolve, reject) => {
        connection.mkdir(smbPath, (err) => {
          // Ignora l'errore se la directory esiste già
          resolve();
        });
      });
    }
    
    throw new Error(`Cannot create directory in current storage type: ${this.config.storage.type}`);
  }

  /**
   * Assicura che esista una directory per una specifica company e tipo di documento
   * @param {number} companyId - ID dell'azienda
   * @param {string} docType - Tipo di documento (es. 'itemCode', 'orders', ecc.)
   * @param {string} docId - ID del documento (es. codice articolo)
   * @returns {Promise<string>} - Percorso completo della directory
   */
  async ensureCompanyDocDir(companyId, docType, docId) {
    const dirPath = path.join('Companies', companyId.toString(), docType, docId);
    await this.ensureDir(dirPath);
    return dirPath;
  }

  /**
   * Ottiene il tipo di storage attualmente in uso
   * @returns {string} - 'local' o 'remote'
   */
  getStorageType() {
    return this.config.storage.type;
  }
}

module.exports = StorageConfig;