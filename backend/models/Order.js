const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pair: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['market', 'limit'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  filledAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partially_filled', 'filled', 'cancelled'],
    default: 'pending'
  },
  fee: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  filledAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  }
});

orderSchema.index({ pair: 1, type: 1, status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);