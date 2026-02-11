const axios = require('axios');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class CryptoBot {
  constructor() {
    this.baseUrl = process.env.CRYPTObot_TEST_NETWORK 
      ? 'https://testnet-pay.crypt.bot' 
      : 'https://pay.crypt.bot';
    this.token = process.env.CRYPTObot_API_TOKEN;
    this.headers = {
      'Crypto-Pay-API-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  async getMe() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/getMe`, {
        headers: this.headers
      });
      
      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(response.data.error.description);
      }
    } catch (error) {
      console.error('CryptoBot getMe error:', error);
      throw error;
    }
  }

  async createInvoice(asset, amount, description, userId, metadata = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/createInvoice`, {
        headers: this.headers,
        params: {
          asset,
          amount,
          description,
          hidden_message: description,
          payload: JSON.stringify({
            userId,
            type: 'deposit',
            metadata
          }),
          paid_btn_name: 'thanks',
          allow_comments: false,
          allow_anonymous: false
        }
      });

      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(response.data.error.description);
      }
    } catch (error) {
      console.error('CryptoBot createInvoice error:', error);
      throw error;
    }
  }

  async getInvoices(parameters = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/getInvoices`, {
        headers: this.headers,
        params: parameters
      });

      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(response.data.error.description);
      }
    } catch (error) {
      console.error('CryptoBot getInvoices error:', error);
      throw error;
    }
  }

  async getInvoice(invoiceId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/getInvoices`, {
        headers: this.headers,
        params: {
          invoice_ids: [invoiceId]
        }
      });

      if (response.data.ok && response.data.result.items.length > 0) {
        return response.data.result.items[0];
      } else {
        throw new Error('Invoice not found');
      }
    } catch (error) {
      console.error('CryptoBot getInvoice error:', error);
      throw error;
    }
  }

  async processInvoiceUpdate(invoice) {
    try {
      const payload = JSON.parse(invoice.payload || '{}');
      
      // Check if transaction already exists
      const existingTransaction = await Transaction.findOne({
        txId: invoice.invoice_id.toString(),
        status: 'completed'
      });

      if (existingTransaction) {
        console.log('Transaction already processed:', invoice.invoice_id);
        return null;
      }

      const user = await User.findById(payload.userId);
      if (!user) {
        console.error('User not found:', payload.userId);
        return null;
      }

      // Create transaction
      const transaction = new Transaction({
        userId: user._id,
        type: 'deposit',
        asset: invoice.asset,
        amount: invoice.amount,
        status: 'completed',
        txId: invoice.invoice_id.toString(),
        paymentMethod: 'CryptoBot',
        description: `Deposit via CryptoBot - Invoice #${invoice.invoice_id}`,
        metadata: {
          invoice,
          payload
        },
        completedAt: new Date(invoice.paid_at * 1000)
      });

      await transaction.save();

      // Update user balance
      const currentBalance = user.balance.get(invoice.asset) || 0;
      user.balance.set(invoice.asset, currentBalance + invoice.amount);
      await user.save();

      console.log(`Successfully processed deposit: User ${user.telegramId}, ${invoice.amount} ${invoice.asset}`);

      return transaction;
    } catch (error) {
      console.error('Error processing invoice:', error);
      return null;
    }
  }
}

module.exports = new CryptoBot();