const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { authMiddleware } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login via Telegram
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName } = req.body;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'Telegram ID is required'
      });
    }

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({
        telegramId,
        telegramUsername: username || '',
        telegramFirstName: firstName || '',
        telegramLastName: lastName || ''
      });

      await user.save();
    } else {
      // Update user info
      if (username) user.telegramUsername = username;
      if (firstName) user.telegramFirstName = firstName;
      if (lastName) user.telegramLastName = lastName;
      
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          telegramFirstName: user.telegramFirstName,
          telegramLastName: user.telegramLastName,
          email: user.email,
          phone: user.phone,
          balance: user.balance,
          status: user.status,
          verificationLevel: user.verificationLevel,
          tradingLimits: user.tradingLimits
        },
        token
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

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          telegramFirstName: user.telegramFirstName,
          telegramLastName: user.telegramLastName,
          email: user.email,
          phone: user.phone,
          balance: user.balance,
          status: user.status,
          verificationLevel: user.verificationLevel,
          tradingLimits: user.tradingLimits,
          kycData: user.kycData
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

// @route   PUT /api/auth/me
// @desc    Update user profile
// @access  Private
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { email, phone } = req.body;

    const user = await User.findById(req.user._id);
    
    if (email) user.email = email;
    if (phone) user.phone = phone;
    
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          telegramFirstName: user.telegramFirstName,
          telegramLastName: user.telegramLastName,
          email: user.email,
          phone: user.phone,
          balance: user.balance,
          status: user.status,
          verificationLevel: user.verificationLevel,
          tradingLimits: user.tradingLimits,
          kycData: user.kycData
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

// @route   PUT /api/auth/kyc
// @desc    Update KYC data
// @access  Private
router.put('/kyc', authMiddleware, async (req, res) => {
  try {
    const { fullName, documentType, documentNumber, documentPhoto, selfiePhoto, address } = req.body;

    const user = await User.findById(req.user._id);

    user.kycData = {
      fullName: fullName || user.kycData.fullName,
      documentType: documentType || user.kycData.documentType,
      documentNumber: documentNumber || user.kycData.documentNumber,
      documentPhoto: documentPhoto || user.kycData.documentPhoto,
      selfiePhoto: selfiePhoto || user.kycData.selfiePhoto,
      address: address || user.kycData.address,
      verifiedAt: user.kycData.verifiedAt
    };

    // If all KYC fields are filled, set status to pending
    if (fullName && documentType && documentNumber && documentPhoto && selfiePhoto && address) {
      user.status = 'pending';
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          telegramFirstName: user.telegramFirstName,
          telegramLastName: user.telegramLastName,
          email: user.email,
          phone: user.phone,
          balance: user.balance,
          status: user.status,
          verificationLevel: user.verificationLevel,
          tradingLimits: user.tradingLimits,
          kycData: user.kycData
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

module.exports = router;