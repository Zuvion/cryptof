const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, pair, type, status } = req.query;
    const query = { userId: req.user._id };

    if (pair) query.pair = pair;
    if (type) query.type = type;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          ordersPerPage: limit
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

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pair, type, orderType, price, amount } = req.body;

    if (!pair || !type || !orderType || !price || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const allowedPairs = ['BTC/USDT', 'ETH/USDT', 'TON/USDT'];
    if (!allowedPairs.includes(pair)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trading pair'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Check user balance
    const [baseAsset, quoteAsset] = pair.split('/');
    const user = await User.findById(req.user._id);
    
    if (type === 'buy') {
      const requiredAmount = amount * price;
      const availableBalance = user.balance.get(quoteAsset) || 0;

      if (availableBalance < requiredAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for purchase'
        });
      }
    } else {
      const availableBalance = user.balance.get(baseAsset) || 0;
      
      if (availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for sale'
        });
      }
    }

    // Create order
    const order = new Order({
      userId: req.user._id,
      pair,
      type,
      orderType,
      price,
      amount
    });

    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (order.status !== 'pending' && order.status !== 'partially_filled') {
      return res.status(400).json({
        success: false,
        message: 'Only pending or partially filled orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    await order.save();

    res.json({
      success: true,
      data: order
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