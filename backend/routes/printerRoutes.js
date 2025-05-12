const express = require('express');
const router = express.Router();
const BrotherPrinter = require('../services/brotherPrinter');
const printer = new BrotherPrinter(true); // true = modalità test

router.post('/print', async (req, res) => {
  try {
    const { orderDetails } = req.body;
    await printer.printLabel(orderDetails);
    res.json({ success: true, message: 'Test di stampa completato. Controlla i log.' });
  } catch (error) {
    console.error('Errore di stampa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;




