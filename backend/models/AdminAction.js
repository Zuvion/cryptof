const mongoose = require('mongoose');

const adminActionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['user', 'transaction', 'order', 'withdraw', 'system'],
    default: 'system'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

adminActionSchema.index({ adminId: 1, createdAt: -1 });
adminActionSchema.index({ action: 1, createdAt: -1 });
adminActionSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AdminAction', adminActionSchema);