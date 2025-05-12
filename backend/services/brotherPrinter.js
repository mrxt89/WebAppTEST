const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class BrotherPrinter {
  constructor(options = {}) {
    this.testMode = options.testMode ?? config.printer.testMode;
    
    if (!this.testMode) {
      this.printer = new ThermalPrinter({
        type: PrinterTypes.BROTHER,
        interface: options.interface || config.printer.interface,
        ...config.printer.options
      });
    }
  }

  async printLabel(orderDetails) {
    try {
      if (this.testMode) {
        // In modalità test, salviamo i dettagli in un file di log
        const logData = {
          timestamp: new Date().toISOString(),
          orderDetails,
          printSimulation: [
            "=== SIMULAZIONE STAMPA ===",
            "DAMA INDUSTRIAL PARTNER SRL",
            `QR Code: ${orderDetails.MONo}`,
            `Codice: ${orderDetails.BOM}`,
            `Descrizione: ${orderDetails.Description}`,
            `Pezzi: ${orderDetails.RemainingQty}`,
            `Data: ${new Date(orderDetails.DeliveryDate).toLocaleDateString()}`,
            `Cliente: ${orderDetails.CustomerName}`,
            "=========================="
          ].join('\n')
        };

        // Crea cartella logs se non esiste
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir);
        }

        // Salva il log in un file
        const logFile = path.join(logsDir, `print_${Date.now()}.log`);
        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
        
        console.log('Test di stampa completato. Log salvato in:', logFile);
        console.log(logData.printSimulation);
        
        return true;
      }

      // In modalità reale, stampiamo il QR code e i dettagli dell'ordine
      await this.printer.isPrinterConnected();

      this.printer.alignCenter();
      this.printer.setTextSize(0, 0);
      this.printer.bold(true);
      this.printer.text("DAMA INDUSTRIAL PARTNER SRL");
      this.printer.bold(false);

      this.printer.qrCode(orderDetails.MONo, {
        cellSize: 8,
        correction: 'H'
      });

      this.printer.setTextSize(0, 0);
      this.printer.alignLeft();
      this.printer.text(`Codice: ${orderDetails.BOM}`);
      this.printer.text(`Descrizione: ${orderDetails.Description}`);
      this.printer.text(`Pezzi: ${orderDetails.RemainingQty}`);
      this.printer.text(`Data: ${new Date(orderDetails.DeliveryDate).toLocaleDateString()}`);
      this.printer.text(`Cliente: ${orderDetails.CustomerName}`);
      
      this.printer.cut();

      await this.printer.execute();
      return true;
    } catch (error) {
      console.error('Errore di stampa:', error);
      throw error;
    }
  }
}

module.exports = BrotherPrinter;