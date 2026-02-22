const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const COMPLETE_DB_PATH = path.join(__dirname, '../data/complete.json');
const INCOMPLETE_DB_PATH = path.join(__dirname, '../data/incomplete.json');
const SETTINGS_DB_PATH = path.join(__dirname, '../data/settings.json');
const HISTORY_DB_PATH = path.join(__dirname, '../data/history.json');

let cache = {
    complete: {},
    incomplete: {},
    settings: {},
    history: {}
};
let saveInterval = null;

function load() {
    try {
        const dataDir = path.dirname(COMPLETE_DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Load Complete
        if (fs.existsSync(COMPLETE_DB_PATH)) {
            cache.complete = JSON.parse(fs.readFileSync(COMPLETE_DB_PATH, 'utf8'));
        } else {
            cache.complete = {};
            fs.writeFileSync(COMPLETE_DB_PATH, '{}');
        }

        // Load Incomplete
        if (fs.existsSync(INCOMPLETE_DB_PATH)) {
            cache.incomplete = JSON.parse(fs.readFileSync(INCOMPLETE_DB_PATH, 'utf8'));
        } else {
            cache.incomplete = {};
            fs.writeFileSync(INCOMPLETE_DB_PATH, '{}');
        }

        // Load Settings
        if (fs.existsSync(SETTINGS_DB_PATH)) {
            cache.settings = JSON.parse(fs.readFileSync(SETTINGS_DB_PATH, 'utf8'));
        } else {
            cache.settings = {};
            fs.writeFileSync(SETTINGS_DB_PATH, '{}');
        }

        // Load History
        if (fs.existsSync(HISTORY_DB_PATH)) {
            cache.history = JSON.parse(fs.readFileSync(HISTORY_DB_PATH, 'utf8'));
        } else {
            cache.history = {};
            fs.writeFileSync(HISTORY_DB_PATH, '{}');
        }

        logger.info('Database loaded (Dual-File System + Settings + History).');
    } catch (err) {
        logger.error('Failed to load database: ' + err.message);
        cache = { complete: {}, incomplete: {}, settings: {}, history: {} };
    }
}

function save() {
    try {
        fs.writeFileSync(COMPLETE_DB_PATH, JSON.stringify(cache.complete, null, 2));
        fs.writeFileSync(INCOMPLETE_DB_PATH, JSON.stringify(cache.incomplete, null, 2));
        fs.writeFileSync(SETTINGS_DB_PATH, JSON.stringify(cache.settings, null, 2));
        fs.writeFileSync(HISTORY_DB_PATH, JSON.stringify(cache.history, null, 2));
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

// --- COMPLETE USERS ---

function getUser(guildId, userId) {
    if (!cache.complete[guildId]) cache.complete[guildId] = {};
    return cache.complete[guildId][userId] || null;
}

function createUser(guildId, userId) {
    if (!cache.complete[guildId]) cache.complete[guildId] = {};

    // Default user profile
    cache.complete[guildId][userId] = getDefaultProfile(userId);
    return cache.complete[guildId][userId];
}

function updateUser(guildId, userId, data) {
    if (!cache.complete[guildId]) cache.complete[guildId] = {};
    if (!cache.complete[guildId][userId]) return null;

    cache.complete[guildId][userId] = { ...cache.complete[guildId][userId], ...data };
    return cache.complete[guildId][userId];
}

function getAllUsers(guildId) {
    return cache.complete[guildId] || {};
}

// --- INCOMPLETE USERS ---

function getIncompleteUser(guildId, userId) {
    if (!cache.incomplete[guildId]) cache.incomplete[guildId] = {};
    return cache.incomplete[guildId][userId] || null;
}

function createIncompleteUser(guildId, userId) {
    if (!cache.incomplete[guildId]) cache.incomplete[guildId] = {};
    cache.incomplete[guildId][userId] = getDefaultProfile(userId);
    cache.incomplete[guildId][userId].onboarded = false; // Explicitly false
    return cache.incomplete[guildId][userId];
}

function updateIncompleteUser(guildId, userId, data) {
    if (!cache.incomplete[guildId]) cache.incomplete[guildId] = {};
    if (!cache.incomplete[guildId][userId]) return null;

    cache.incomplete[guildId][userId] = { ...cache.incomplete[guildId][userId], ...data };
    return cache.incomplete[guildId][userId];
}

function getAllIncompleteUsers(guildId) {
    return cache.incomplete[guildId] || {};
}

// --- SETTINGS ---

function getGuildSettings(guildId) {
    if (!cache.settings[guildId]) cache.settings[guildId] = {};
    return cache.settings[guildId];
}

function updateGuildSettings(guildId, data) {
    if (!cache.settings[guildId]) cache.settings[guildId] = {};
    cache.settings[guildId] = { ...cache.settings[guildId], ...data };
    return cache.settings[guildId];
}

// --- HISTORY ---

function getHistory(guildId) {
    if (!cache.history[guildId]) cache.history[guildId] = [];
    return cache.history[guildId];
}

function addHistory(guildId, data) {
    if (!cache.history[guildId]) cache.history[guildId] = [];
    // Prepend new history (newest first)
    cache.history[guildId].unshift({
        timestamp: Date.now(),
        ...data
    });
    // Optional: Limit history size? keeping all for now as per "historical archive" request
    return cache.history[guildId];
}

// --- MIGRATION ---

function migrateToComplete(guildId, userId) {
    const incompleteUser = getIncompleteUser(guildId, userId);

    if (incompleteUser) {
        // Move data
        if (!cache.complete[guildId]) cache.complete[guildId] = {};
        cache.complete[guildId][userId] = { ...incompleteUser, onboarded: true };

        // Delete from incomplete
        delete cache.incomplete[guildId][userId];
    } else {
        // Create fresh if not exists
        createUser(guildId, userId);
    }
}

// --- UTILS ---

function getDefaultProfile(userId) {
    return {
        id: userId,
        xp: 0,
        level: 1,
        tokens: 0,
        market_stock: {},
        lottery: {
            current_tickets: 0,
            lifetime_tickets: 0,
            wins: { first: 0, second: 0, third: 0 },
            joined: 0
        },
        last_message_content: null,
        onboarded: true,
        joinedAt: Date.now()
    };
}

// For raw access if needed (e.g. resets)
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
    getIncompleteUser,
    createIncompleteUser,
    updateIncompleteUser,
    getAllIncompleteUsers,
    getGuildSettings,
    updateGuildSettings,
    getHistory,
    addHistory,
    migrateToComplete,
    getCache
};
