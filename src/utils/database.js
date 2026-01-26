const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DB_PATH = path.join(__dirname, '../../data/users.json');
let cache = {};
let saveInterval = null;

function load() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            cache = JSON.parse(data);
            logger.info('Database loaded from disk.');
        } else {
            logger.warn('No database file found. Starting with empty database.');
            cache = {};
            save(); // Create the file
        }
    } catch (err) {
        logger.error('Failed to load database: ' + err.message);
        cache = {};
    }
}

function save() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
        logger.event('Database saved to disk (Background Task).');
    } catch (err) {
        logger.error('Failed to save database: ' + err.message);
    }
}

function startAutosave() {
    if (saveInterval) return;
    saveInterval = setInterval(() => {
        save();
    }, 60000); // 60 seconds
    logger.info('Autosave started (60s interval).');
}

function getUser(guildId, userId) {
    if (!cache[guildId]) cache[guildId] = {};
    return cache[guildId][userId] || null;
}

function createUser(guildId, userId) {
    if (!cache[guildId]) cache[guildId] = {};

    // Default user profile
    cache[guildId][userId] = {
        id: userId,
        xp: 0,
        level: 1,
        tokens: 0,
        market_stock: {}, // itemId: count_bought
        last_message_content: null, // For entropy check
        onboarded: true,
        joinedAt: Date.now()
    };
    return cache[guildId][userId];
}

function updateUser(guildId, userId, data) {
    if (!cache[guildId]) cache[guildId] = {};
    if (!cache[guildId][userId]) return null;

    cache[guildId][userId] = { ...cache[guildId][userId], ...data };
    return cache[guildId][userId];
}

function getAllUsers(guildId) {
    return cache[guildId] || {};
}

// For accessing the raw cache if needed (e.g. for global resets across all guilds, though we should target specific guilds)
function getCache() {
    return cache;
}

module.exports = {
    load,
    save,
    startAutosave,
    getUser,
    createUser,
    updateUser,
    getAllUsers,
    getCache
};
