const express = require('express');
const router = express.Router();
const WithdrawRequest = require('../models/WithdrawRequest');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { authMiddleware, verifyVerifiedMiddleware } = require('../middleware/auth');

// @route   GET /api/withdraw
// @desc    Get user withdraw requests
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const requests = await WithdrawRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WithdrawRequest.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          requestsPerPage: limit
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

// @route   GET /api/withdraw/:id
// @desc    Get withdraw request by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await WithdrawRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdraw request not found'
      });
    }

    if (request.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/withdraw
// @desc    Create withdraw request
// @access  Private
router.post('/', authMiddleware, verifyVerifiedMiddleware, async (req, res) => {
  try {
    const { asset, amount, paymentDetails } = req.body;

    if (!asset || !amount || !paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Asset, amount, and payment details are required'
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

    // Check user balance
    const user = await User.findById(req.user._id);
    const currentBalance = user.balance.get(asset) || 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Calculate fee (e.g., 2% fee)
    const fee = amount * 0.02;
    const totalAmount = amount + fee;

    if (currentBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance including fee'
      });
    }

    // Create withdraw request
    const request = new WithdrawRequest({
      userId: req.user._id,
      asset,
      amount,
      paymentDetails,
      fee
    });

    await request.save();

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/withdraw/:id/cancel
// @desc    Cancel withdraw request
// @access  Private
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const request = await WithdrawRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdraw request not found'
      });
    }

    if (request.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled'
      });
    }

    request.status = 'cancelled';
    request.cancelledAt = Date.now();
    await request.save();

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;