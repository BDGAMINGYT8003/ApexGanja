const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

let db;
let client;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'apex-girls-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Test Middleware
if (process.env.NODE_ENV === 'test' || process.env.TEST_USER_ID) {
    app.use((req, res, next) => {
        if (process.env.TEST_USER_ID && !req.session.user) {
            req.session.user = { id: process.env.TEST_USER_ID, username: 'TestUser' };
        }
        next();
    });
}

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const { MARKET_ITEMS } = require('./utils/constants');

// Auth Routes
app.get('/api/auth/discord', (req, res) => {
    const scope = 'identify guilds';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    res.redirect(url);
});

app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/?error=no_code`);

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const userData = userResponse.data;
        req.session.user = userData;

        // Ensure user exists in DB (silent onboarding if not)
        const userId = userData.id;
        // Assuming global guild for now as per scheduler usage
        const existingUser = db.getUser('global', userId) || db.getIncompleteUser('global', userId);

        if (!existingUser) {
             db.createIncompleteUser('global', userId);
        }

        req.session.save(() => {
            res.redirect(`${FRONTEND_URL}/dashboard`);
        });
    } catch (err) {
        logger.error('Auth error: ' + err.message);
        res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
    }
});

app.get('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect(`${FRONTEND_URL}/`);
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.session.user.id;
    // Fetch latest data from DB
    const user = db.getUser('global', userId) || db.getIncompleteUser('global', userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        discord: req.session.user,
        stats: user
    });
});

// --- MARKET ---

app.get('/api/market', (req, res) => {
    res.json(MARKET_ITEMS);
});

app.post('/api/market/buy', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.session.user.id;
    const { itemId, amount = 1 } = req.body;

    if (!itemId) return res.status(400).json({ error: 'Missing itemId' });

    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const user = db.getUser('global', userId) || db.getIncompleteUser('global', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check Balance
    const totalCost = item.cost * amount;
    if ((user.tokens || 0) < totalCost) {
        return res.status(400).json({ error: 'Insufficient tokens' });
    }

    // Check Stock Limit
    const currentStock = (user.market_stock && user.market_stock[itemId]) || 0;
    if (currentStock + amount > item.maxStock) {
        return res.status(400).json({ error: `Stock limit reached (Max: ${item.maxStock})` });
    }

    // Check Level Requirement
    if (user.level < item.minLevel) {
        return res.status(400).json({ error: `Level ${item.minLevel} required` });
    }

    // Transaction
    user.tokens -= totalCost;
    if (!user.market_stock) user.market_stock = {};
    user.market_stock[itemId] = currentStock + amount;

    // Special Logic for Lottery Tickets
    if (itemId === 'lottery_ticket') {
        if (!user.lottery) user.lottery = { current_tickets: 0, lifetime_tickets: 0, wins: { first: 0, second: 0, third: 0 }, joined: 0 };
        user.lottery.current_tickets += amount;
        user.lottery.lifetime_tickets = (user.lottery.lifetime_tickets || 0) + amount;
    }

    // Save
    if (db.getUser('global', userId)) {
        db.updateUser('global', userId, user);
    } else {
        db.updateIncompleteUser('global', userId, user);
    }

    res.json({
        success: true,
        message: `Purchased ${amount}x ${item.name}`,
        newBalance: user.tokens,
        newStock: user.market_stock[itemId]
    });
});

// --- LEADERBOARD & LOTTERY ---

app.get('/api/leaderboard', (req, res) => {
    const users = Object.values(db.getAllUsers('global'));
    const sorted = users.sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
    const top100 = sorted.slice(0, 100).map(u => ({
        id: u.id,
        level: u.level,
        total_xp: u.total_xp,
        tokens: u.tokens
    }));

    // Add history
    const history = db.getHistory('global') || [];

    res.json({
        current: top100,
        history: history.map(h => ({
            month: h.month,
            timestamp: h.timestamp,
            leaderboard: h.leaderboard
        }))
    });
});

app.get('/api/lottery', (req, res) => {
    // Current Status
    const users = Object.values(db.getAllUsers('global'));
    let totalTickets = 0;
    let participants = 0;

    users.forEach(u => {
        if (u.lottery && u.lottery.current_tickets > 0) {
            totalTickets += u.lottery.current_tickets;
            participants++;
        }
    });

    // History
    const history = db.getHistory('global') || [];

    res.json({
        current: {
            participants,
            totalTickets,
            prizePool: 'See Monthly Rewards'
        },
        history: history.map(h => ({
            month: h.month,
            timestamp: h.timestamp,
            lottery: h.lottery
        }))
    });
});

// API Routes Placeholder
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve Frontend (Production)
// Assuming client build output is in ../client/dist
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

function init(discordClient, database) {
    client = discordClient;
    db = database;
}

function start(discordClient, database) {
    init(discordClient, database);

    app.listen(PORT, () => {
        logger.info(`Web server running on port ${PORT}`);
    });
}

module.exports = { start, init, app, getDb: () => db, getClient: () => client };
