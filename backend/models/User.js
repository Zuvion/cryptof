const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  telegramUsername: {
    type: String,
    default: ''
  },
  telegramFirstName: {
    type: String,
    default: ''
  },
  telegramLastName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  balance: {
    type: Map,
    of: Number,
    default: {
      USDT: 0,
      BTC: 0,
      ETH: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'pending'],
    default: 'active'
  },
  verificationLevel: {
    type: String,
    enum: ['basic', 'verified', 'premium'],
    default: 'basic'
  },
  kycData: {
    fullName: { type: String, default: '' },
    documentType: { type: String, default: '' },
    documentNumber: { type: String, default: '' },
    documentPhoto: { type: String, default: '' },
    selfiePhoto: { type: String, default: '' },
    address: { type: String, default: '' },
    verifiedAt: { type: Date, default: null }
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tradingLimits: {
    dailyDepositLimit: { type: Number, default: 10000 },
    dailyWithdrawLimit: { type: Number, default: 5000 },
    monthlyDepositLimit: { type: Number, default: 50000 },
    monthlyWithdrawLimit: { type: Number, default: 25000 }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(8).toString('hex');
  }
  
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 3600000; // 1 hour
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);