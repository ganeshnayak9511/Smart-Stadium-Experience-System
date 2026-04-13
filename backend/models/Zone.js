const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  currentDensity: { type: Number, default: 0 },
  capacity: { type: Number, required: true },
  estimatedWaitTime: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Zone', ZoneSchema);
