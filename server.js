const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch'); 
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3001; 

// ====================================================
// DATABASE & MODELS
// ====================================================
const DB_URI = process.env.MONGODB_URI;
const Blacklist = require('./models/Blacklist');
const BotStats = require('./models/BotStats');
const GuildSettings = require('./models/GuildSettings');

mongoose.connect(DB_URI)
    .then(() => console.log('Successfully connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));

// ====================================================
// DISCORD & ENVIRONMENT CONSTANTS
// ====================================================
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; 
const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';
const OAUTH_SCOPES = 'identify guilds email'; 
const ADMIN_ID_STRING = process.env.ADMIN_USER_ID;
const ADMIN_USER_ID = ADMIN_ID_STRING ? ADMIN_ID_STRING.split(',').map(id => id.trim()) : [];
const BOT_UPDATE_SECRET = process.env.BOT_UPDATE_SECRET;
const BOT_ID_DB = 'StarSafeBot';

// --- TEMPORARY DEBUG LINE ---
console.log(`Debug: Admin ID loaded as: [${ADMIN_USER_ID}]`); 
// --- END DEBUG LINE ---


// ====================================================
// VIEW ENGINE & MIDDLEWARE
// ====================================================

// 1. Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static File Serving
// This tells Express to look into the 'public' folder for any CSS/JS links
app.use(express.static(path.join(__dirname, 'public')));

// 4. Auth Middlewares
function checkAuth(req, res, next) {
    if (req.session.user) return next(); 
    res.redirect('/'); 
}

function checkAdmin(req, res, next) {
    if (req.session.user && ADMIN_USER_ID.includes(req.session.user.id)) return next();
    res.redirect('/dashboard'); 
}

// ====================================================
// PAGE ROUTES (RENDERED VIA EJS)
// ====================================================

// Fix: The Root Route now explicitly renders login.ejs if not logged in
app.get('/', (req, res) => {
    if (req.session.user) {
        return ADMIN_USER_ID.includes(req.session.user.id) 
            ? res.redirect('/admin') 
            : res.redirect('/dashboard');
    }
    res.render('login'); 
});

// Dynamic User Dashboard
app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const blacklistCount = await Blacklist.countDocuments();
        const stats = await BotStats.findOne({ botId: BOT_ID_DB });

        res.render('dashboard', {
            user: req.session.user,
            stats: {
                blacklistCount: blacklistCount || 0,
                serverCount: stats ? stats.serverCount : 0,
                totalMembers: stats ? stats.totalMembers : 0,
                latency: stats ? stats.latency : '0ms'
            }
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Dynamic Admin Panel
app.get('/admin', checkAuth, checkAdmin, async (req, res) => {
    try {
        const blacklistCount = await Blacklist.countDocuments();
        const stats = await BotStats.findOne({ botId: BOT_ID_DB });
        const recentBlacklist = await Blacklist.find().sort({ dateAdded: -1 }).limit(5);

        res.render('admin', {
            user: req.session.user,
            stats: stats || { latency: 'N/A', serverCount: 0 },
            blacklistCount: blacklistCount,
            recentBlacklist: recentBlacklist
        });
    } catch (error) {
        console.error('Admin Error:', error);
        res.status(500).send('Error loading admin panel');
    }
});

app.get('/servers', checkAuth, async (req, res) => {
    try {
        // Look in the new session location
        const userGuilds = req.session.guilds || [];
        
        const botData = await BotStats.findOne({ botId: BOT_ID_DB });
        const botGuildIds = botData && botData.guildIds ? botData.guildIds : [];

        const guildsWithStatus = userGuilds.map(guild => ({
            ...guild,
            hasBot: botGuildIds.includes(guild.id)
        }));

        res.render('servers', {
            user: req.session.user,
            guilds: guildsWithStatus,
            inviteUrl: process.env.BOT_INVITE_URL
        });
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/blacklist-manage', checkAuth, checkAdmin, async (req, res) => {
    try {
        // Fetch all blacklisted users, newest first
        const entries = await Blacklist.find().sort({ dateAdded: -1 });
        
        res.render('blacklist-manage', {
            user: req.session.user,
            blacklist: entries,
            // Check for success message in URL query
            success: req.query.success || null 
        });
    } catch (error) {
        console.error("Blacklist Page Error:", error);
        res.status(500).send("Error loading Blacklist Management");
    }
});

app.get('/blacklist', checkAuth, async (req, res) => {
    try {
        const entries = await Blacklist.find().sort({ dateAdded: -1 });
        res.render('blacklist', {
            user: req.session.user,
            blacklist: entries
        });
    } catch (error) {
        console.error("Blacklist View Error:", error);
        res.status(500).send("Error loading blacklist");
    }
});

// ====================================================
// AUTH & API ROUTES
// ====================================================

app.get('/login', (req, res) => {
    const discordAuthUrl = `${DISCORD_API_ENDPOINT}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(OAUTH_SCOPES)}`;
    res.redirect(discordAuthUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');

    try {
        // 1. Exchange code for Access Token
        const tokenResponse = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
        });
        const tokenData = await tokenResponse.json();

        // 2. Fetch User Profile
        const userResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        // 3. NEW: Fetch User Guilds (Servers)
        const guildsResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const guildsData = await guildsResponse.json();

        // 4. Save to Session
        req.session.user = {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar
    };

        // Save this separately so the Manage route can find it!
        req.session.guilds = guildsData.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);
        // Now the redirect will work correctly
        ADMIN_USER_ID.includes(userData.id) ? res.redirect('/admin') : res.redirect('/dashboard');
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).send('Authentication Error');
    }
        // --- TEMPORARY DEBUG LINE ---
        console.log(`Callback Check: User ID [${req.session.user.id}] vs Admin ID [${ADMIN_USER_ID}]`);
        // --- END DEBUG LINE ---
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// --- API: ADD TO BLACKLIST ---
app.post('/api/blacklist/add', checkAuth, checkAdmin, async (req, res) => {
    const { discordId, reason, evidence, reports } = req.body;
    try {
        await Blacklist.findOneAndUpdate(
            { discordId },
            { 
                reason: reason || "No reason provided", 
                evidence, 
                reports: Number(reports) || 1, 
                adminId: req.session.user.id, 
                dateAdded: Date.now() 
            },
            { upsert: true, new: true }
        );
        // Redirect back to page with success message
        res.redirect('/blacklist-manage?success=added');
    } catch (error) {
        console.error("Blacklist Add Error:", error);
        res.status(500).send("Error adding user to blacklist");
    }
});

// --- API: REMOVE FROM BLACKLIST ---
// Changed to POST for easier use with HTML forms
app.post('/api/blacklist/remove/:discordId', checkAuth, checkAdmin, async (req, res) => {
    try {
        await Blacklist.deleteOne({ discordId: req.params.discordId });
        res.redirect('/blacklist-manage?success=removed');
    } catch (error) {
        console.error("Blacklist Remove Error:", error);
        res.status(500).send("Error removing user");
    }
});

app.post('/api/bot/update-stats', async (req, res) => {
    const { botId, serverCount, latency, guildIds } = req.body;
    const secret = req.headers['x-bot-secret'];

    if (secret !== process.env.BOT_UPDATE_SECRET) {
        return res.status(403).json({ success: false });
    }

    try {
        // 1. Math: Round down to nearest 10 and add "+" (e.g., 66 becomes "60+")
        const milestoneDisplay = Math.floor(Number(serverCount) / 10) * 10 + "+";

        await BotStats.deleteMany({ botId: botId });

        const freshStats = new BotStats({
            botId,
            // We save the milestone string here
            serverCount: milestoneDisplay, 
            latency,
            guildIds: guildIds || [],
            lastUpdated: new Date()
        });

        await freshStats.save();
        console.log(`[DB-SUCCESS] Saved as Milestone: ${milestoneDisplay}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Database update failed:", error);
        res.status(500).json({ success: false });
    }
});

app.get('/manage/:guildId', async (req, res) => {
    const { guildId } = req.params;

    // 1. Session Check: Are they logged in?
    if (!req.session.user) {
        console.log(`[AUTH FAIL] User tried to manage ${guildId} but session is empty.`);
        return res.redirect('/auth/discord'); 
    }

    // 2. Data Check: Do we have their server list?
    // If not, we force a silent re-sync instead of just failing
    if (!req.session.guilds) {
        console.log(`[DATA FAIL] User logged in, but server list missing. Redirecting to auth to fetch it.`);
        return res.redirect('/auth/discord');
    }

    try {
        // 3. Find the specific server in THEIR list
        const userGuild = req.session.guilds.find(g => g.id === guildId);
        
        // 4. Check if Bot is in the server (Database Check)
        const stats = await BotStats.findOne({ botId: "StarSafeBot" });
        const isBotPresent = stats && stats.guildIds.includes(guildId);

        // Logic: You must own the server AND the bot must be there
        if (!userGuild) {
            return res.status(403).send("You do not have permission to manage this server.");
        }
        if (!isBotPresent) {
            return res.status(404).send("StarSafe is not in this server. Please invite it first.");
        }

        // 5. Render the page
        res.render('manage-server', {
            guild: userGuild,
            user: req.session.user
        });

    } catch (err) {
        console.error("Manage Route Error:", err);
        res.status(500).send("Server Error");
    }
});

app.post('/api/save-settings/:guildId', checkAuth, async (req, res) => {
    const { guildId } = req.params;
    const { cooldown, logChannelId } = req.body;

    try {
        await GuildSettings.findOneAndUpdate(
            { guildId },
            { 
                // We store the number of minutes directly
                cooldown: parseInt(cooldown) || 0, 
                logChannelId: logChannelId.trim(), 
                lastUpdated: Date.now() 
            },
            { upsert: true }
        );
        res.redirect(`/manage/${guildId}?success=true`);
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Failed to save settings.");
    }
});

app.listen(PORT, () => {
    console.log(`StarSafe running on http://localhost:${PORT}`);
});