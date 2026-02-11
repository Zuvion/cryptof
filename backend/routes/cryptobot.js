const express = require('express');
const router = express.Router();
const cryptoBot = require('../utils/cryptoBot');

// @route   POST /api/cryptobot/webhook
// @desc    Webhook for CryptoBot invoice updates
// @access  Public
router.post('/webhook', async (req, res) => {
  try {
    const { update } = req.body;

    if (!update) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update format'
      });
    }

    // Handle invoice paid
    if (update.invoice_paid) {
      const invoice = update.invoice_paid.invoice;
      console.log('Invoice paid:', invoice);

      const transaction = await cryptoBot.processInvoiceUpdate(invoice);
      
      if (transaction) {
        res.json({
          success: true,
          message: 'Invoice processed successfully',
          data: transaction
        });
      } else {
        res.json({
          success: true,
          message: 'Invoice already processed'
        });
      }
    }

    // Handle invoice cancelled
    if (update.invoice_cancelled) {
      const invoice = update.invoice_cancelled.invoice;
      console.log('Invoice cancelled:', invoice);

      res.json({
        success: true,
        message: 'Invoice cancelled'
      });
    }

    // Handle invoice expired
    if (update.invoice_expired) {
      const invoice = update.invoice_expired.invoice;
      console.log('Invoice expired:', invoice);

      res.json({
        success: true,
        message: 'Invoice expired'
      });
    }

    res.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('CryptoBot webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/cryptobot/test
// @desc    Test CryptoBot API connection
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const me = await cryptoBot.getMe();
    res.json({
      success: true,
      data: me
    });
  } catch (error) {
    console.error('CryptoBot test error:', error);
    res.status(500).json({
      success: false,
      message: 'CryptoBot API connection failed',
      error: error.message
    });
  }
});

// @route   POST /api/cryptobot/invoice
// @desc    Create CryptoBot invoice
// @access  Public
router.post('/invoice', async (req, res) => {
  try {
    const { asset, amount, description, userId, metadata } = req.body;

    const invoice = await cryptoBot.createInvoice(asset, amount, description, userId, metadata);
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('CryptoBot create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
});

// @route   GET /api/cryptobot/invoice/:id
// @desc    Get invoice by ID
// @access  Public
router.get('/invoice/:id', async (req, res) => {
  try {
    const invoice = await cryptoBot.getInvoice(req.params.id);
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('CryptoBot get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice',
      error: error.message
    });
  }
});

module.exports = router;