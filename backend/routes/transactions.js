const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authMiddleware } = require('../middleware/auth');
const cryptoBot = require('../utils/cryptoBot');

// @route   GET /api/transactions
// @desc    Get user transactions
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const query = { userId: req.user._id };

    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          transactionsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/transactions/deposit
// @desc    Create deposit invoice
// @access  Private
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { asset, amount } = req.body;

    if (!asset || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Asset and amount are required'
      });
    }

    const allowedAssets = ['USDT', 'BTC', 'ETH', 'TON'];
    if (!allowedAssets.includes(asset)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Create invoice
    const invoice = await cryptoBot.createInvoice(
      asset,
      amount,
      `Deposit ${amount} ${asset}`,
      req.user._id
    );

    res.json({
      success: true,
      data: {
        invoice: {
          id: invoice.invoice_id,
          asset: invoice.asset,
          amount: invoice.amount,
          status: invoice.status,
          payUrl: invoice.pay_url,
          createdAt: invoice.created_at,
          expiresAt: invoice.expiration_date
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;