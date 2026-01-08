const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    // --- Key Identification Field ---
    
    // The Discord ID of the user being blacklisted. 
    discordId: {
        type: String,
        required: true,
        unique: true,   // Ensures only one entry per user ID
        index: true     // Recommended for fast lookups
    },

    // --- Moderation Details ---
    
    // The reason for the blacklisting.
    reason: {
        type: String,
        required: true,
        default: 'No reason provided.'
    },

    // NEW FIELD: A link to the evidence (e.g., screenshot, message link).
    evidence: {
        type: String,
        required: false, // Not strictly mandatory, but good to have
        default: ''      // Set default to an empty string instead of null
    },

    // The Discord ID of the bot admin who placed the blacklist entry.
    adminId: {
        type: String,
        required: true,
    },

    reports: {
        type: Number,
        required: false,
        default: 1,
    },
    
    // --- Timestamps ---
    
    // The date and time the entry was added.
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

module.exports = Blacklist;