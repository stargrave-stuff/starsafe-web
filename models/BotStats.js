const mongoose = require('mongoose');

const botStatsSchema = new mongoose.Schema({
    botId: { type: String, required: true, unique: true },
    serverCount: { type: String, default: "0+" }, // Changed from Number to String
    latency: { type: String, default: '0ms' },
    guildIds: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BotStats', botStatsSchema);