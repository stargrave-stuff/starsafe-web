const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    cooldown: { type: Number, default: 1 }, // Cooldown in minutes
    logChannelId: { type: String, default: "" }, // Discord Channel ID
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);