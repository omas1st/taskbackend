const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:    { type: Number, required: true },
  crypto:    { type: String, enum: ['BTC', 'ETH', 'XRP'], required: true },
  address:   { type: String, required: true },
  status:    {
    type: String,
    enum: ['pending', 'taxPaid', 'servicePaid', 'completed', 'rejected'],
    default: 'pending'
  },
  taxAmount:     { type: Number },   // 5% tax
  serviceAmount: { type: Number }    // 10% service fee
}, { timestamps: true });

module.exports = mongoose.model('Withdraw', withdrawSchema);
