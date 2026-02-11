const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminAction = require('../models/AdminAction');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked'
      });
    }

    // Check if user is locked
    if (user.security.lockUntil && user.security.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.security.lockUntil - Date.now()) / 1000 / 60);
      return res.status(403).json({
        success: false,
        message: `Your account has been locked. Please try again in ${remainingTime} minutes`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

const adminAuthMiddleware = async (req, res, next) => {
  try {
    await authMiddleware(req, res, async () => {
      const isAdmin = process.env.TELEGRAM_ADMIN_IDS && 
        process.env.TELEGRAM_ADMIN_IDS.split(',').includes(req.user.telegramId);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access admin routes'
        });
      }

      // Log admin action
      const adminAction = new AdminAction({
        adminId: req.user._id,
        action: 'admin_access',
        targetType: 'system',
        description: 'Admin accessed restricted route',
        details: {
          route: req.originalUrl,
          method: req.method
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      await adminAction.save();

      next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access admin routes'
    });
  }
};

const verifyPremiumMiddleware = (req, res, next) => {
  try {
    if (req.user.verificationLevel !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'Premium account required for this feature'
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Premium account required for this feature'
    });
  }
};

const verifyVerifiedMiddleware = (req, res, next) => {
  try {
    if (req.user.verificationLevel === 'basic') {
      return res.status(403).json({
        success: false,
        message: 'Account verification required for this feature'
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required for this feature'
    });
  }
};

module.exports = {
  authMiddleware,
  adminAuthMiddleware,
  verifyPremiumMiddleware,
  verifyVerifiedMiddleware
};
