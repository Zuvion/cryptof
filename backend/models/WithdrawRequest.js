const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  asset: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  paymentDetails: {
    bankName: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    cardNumber: { type: String, default: '' },
    cardHolder: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    additionalInfo: { type: String, default: '' }
  },
  reviewInfo: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewNotes: { type: String, default: '' },
    reviewedAt: { type: Date, default: null }
  },
  txId: {
    type: String,
    default: ''
  },
  fee: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  }
});

withdrawRequestSchema.index({ userId: 1, createdAt: -1 });
withdrawRequestSchema.index({ status: 1, createdAt: -1 });
withdrawRequestSchema.index({ reviewedBy: 1, status: 1 });

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);