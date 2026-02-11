const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WithdrawRequest = require('../models/WithdrawRequest');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const AdminAction = require('../models/AdminAction');
const { adminAuthMiddleware } = require('../middleware/auth');

router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, verificationLevel } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { telegramId: { $regex: search, $options: 'i' } },
        { telegramUsername: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (verificationLevel) {
      query.verificationLevel = verificationLevel;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          usersPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100);
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100);

    res.json({
      success: true,
      data: {
        user,
        transactions,
        orders
      }
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/users/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    await new AdminAction({
      adminId: req.user._id,
      action: 'update_user_status',
      targetType: 'user',
      targetId: user._id,
      description: `Changed user status to ${status}`,
      details: {
        previousStatus: user.status,
        newStatus: status,
        reason: reason || 'No reason provided'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/users/:id/verification', adminAuthMiddleware, async (req, res) => {
  try {
    const { level } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.verificationLevel = level;
    await user.save();

    await new AdminAction({
      adminId: req.user._id,
      action: 'update_user_verification',
      targetType: 'user',
      targetId: user._id,
      description: `Changed user verification level to ${level}`,
      details: {
        previousLevel: user.verificationLevel,
        newLevel: level
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user verification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/users/:id/balance', adminAuthMiddleware, async (req, res) => {
  try {
    const { asset, amount, reason, type = 'adjustment' } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentAmount = user.balance.get(asset) || 0;
    let newAmount;

    switch (type) {
      case 'credit':
        newAmount = currentAmount + amount;
        break;
      case 'debit':
        newAmount = currentAmount - amount;
        if (newAmount < 0) newAmount = 0;
        break;
      case 'set':
        newAmount = amount;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid operation type' });
    }

    user.balance.set(asset, newAmount);
    await user.save();

    await new Transaction({
      userId: user._id,
      type: 'admin',
      asset,
      amount: newAmount - currentAmount,
      status: 'completed',
      metadata: {
        adminId: req.user._id,
        previousAmount: currentAmount,
        newAmount,
        reason: reason || 'Admin adjustment',
        operationType: type
      },
      completedAt: new Date()
    }).save();

    await new AdminAction({
      adminId: req.user._id,
      action: 'update_user_balance',
      targetType: 'user',
      targetId: user._id,
      description: `Updated ${asset} balance from ${currentAmount.toFixed(8)} to ${newAmount.toFixed(8)}`,
      details: {
        asset,
        previousAmount: currentAmount,
        newAmount,
        reason: reason || 'Admin adjustment',
        operationType: type
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/withdraw', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    const requests = await WithdrawRequest.find(query)
      .populate('userId', 'telegramId telegramUsername')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WithdrawRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          requestsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting withdraw requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/withdraw/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const request = await WithdrawRequest.findById(req.params.id)
      .populate('userId', 'telegramId telegramUsername');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Withdraw request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error getting withdraw request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/withdraw/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const request = await WithdrawRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Withdraw request not found' });
    }

    request.status = status;
    if (reviewNotes) {
      request.reviewInfo = {
        reviewedBy: req.user._id,
        reviewNotes,
        reviewedAt: new Date()
      };
    }

    if (status === 'approved') {
      request.completedAt = new Date();
    } else if (status === 'rejected') {
      request.rejectedAt = new Date();
    }

    await request.save();

    await new AdminAction({
      adminId: req.user._id,
      action: 'update_withdraw_status',
      targetType: 'withdraw',
      targetId: request._id,
      description: `Changed withdraw request status to ${status}`,
      details: {
        previousStatus: request.status,
        newStatus: status,
        reviewNotes: reviewNotes || 'No notes'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error updating withdraw status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/transactions', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, type, status } = req.query;
    const query = {};

    if (userId) {
      query.userId = userId;
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'telegramId telegramUsername')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          transactionsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/orders', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, pair, status } = req.query;
    const query = {};

    if (userId) {
      query.userId = userId;
    }

    if (pair) {
      query.pair = pair;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'telegramId telegramUsername')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          ordersPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/actions', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, adminId, action } = req.query;
    const query = {};

    if (adminId) {
      query.adminId = adminId;
    }

    if (action) {
      query.action = { $regex: action, $options: 'i' };
    }

    const actions = await AdminAction.find(query)
      .populate('adminId', 'telegramId telegramUsername')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdminAction.countDocuments(query);

    res.json({
      success: true,
      data: {
        actions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalActions: total,
          actionsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting admin actions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dashboard', adminAuthMiddleware, async (req, res) => {
  try {
    const [totalUsers, pendingWithdraw, totalTransactions, activeOrders] = await Promise.all([
      User.countDocuments(),
      WithdrawRequest.countDocuments({ status: 'pending' }),
      Transaction.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }),
      Order.countDocuments({ status: 'pending' })
    ]);

    const recentActivity = await AdminAction.find()
      .populate('adminId', 'telegramId telegramUsername')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        statistics: {
          totalUsers,
          pendingWithdraw,
          totalTransactions,
          activeOrders
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;