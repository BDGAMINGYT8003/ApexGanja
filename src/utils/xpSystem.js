const db = require('./database');
const { LEVEL_CONSTANTS, TOKEN_REWARDS } = require('./constants');
const logger = require('./logger');

// In-memory cooldowns: Map<userId, timestamp>
const cooldowns = new Map();

/**
 * Calculates XP required for the NEXT level.
 * Formula: (75 * CurrentLevel) + (15 * (CurrentLevel^2))
 * @param {number} currentLevel
 * @returns {number} XP cost
 */
function getXpForNextLevel(currentLevel) {
    return (LEVEL_CONSTANTS.BASE * currentLevel) + (LEVEL_CONSTANTS.QUADRATIC * Math.pow(currentLevel, 2));
}

/**
 * Calculates CI Tokens awarded for reaching a specific level.
 * @param {number} level The level JUST reached.
 * @returns {number} Tokens to award.
 */
function getTokenReward(level) {
    if (level >= TOKEN_REWARDS.TIER_1.min && level <= TOKEN_REWARDS.TIER_1.max) {
        return TOKEN_REWARDS.TIER_1.amount;
    }
    if (level >= TOKEN_REWARDS.TIER_2.min && level <= TOKEN_REWARDS.TIER_2.max) {
        return TOKEN_REWARDS.TIER_2.amount;
    }
    if (level >= TOKEN_REWARDS.TIER_3.min && level <= TOKEN_REWARDS.TIER_3.max) {
        return TOKEN_REWARDS.TIER_3.amount;
    }
    // Level 31+
    return TOKEN_REWARDS.TIER_4.amount;
}

/**
 * Processes a message for XP gain.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} content
 * @returns {Object|null} Result object { xpGained, newLevel, tokensAwarded } or null if no XP
 */
function processMessage(guildId, userId, content) {
    const user = db.getUser(guildId, userId);
    if (!user) return null; // Not onboarded

    // 1. Length Check
    if (content.length < 7) return null;

    // 2. Entropy Check
    if (user.last_message_content === content) return null;

    // 3. Cooldown Check
    const now = Date.now();
    const lastXpTime = cooldowns.get(userId) || 0;
    if (now - lastXpTime < 60000) return null;

    // --- AWARD XP ---
    const xpGained = Math.floor(Math.random() * (5 - 2 + 1)) + 2; // Random 2-5

    // Update Cooldown
    cooldowns.set(userId, now);

    // Calculate Leveling
    let currentLevel = user.level || 1;
    const oldLevel = currentLevel;
    let currentXp = (user.xp || 0) + xpGained;
    let totalXp = (user.total_xp || 0) + xpGained;
    let tokens = user.tokens || 0;
    let leveledUp = false;
    let tokensAwarded = 0;

    // Check for level ups (loop in case massive XP - unlikely but safe)
    let requiredXp = getXpForNextLevel(currentLevel);

    while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        currentLevel++;
        leveledUp = true;

        // Award Tokens
        const reward = getTokenReward(currentLevel);
        tokens += reward;
        tokensAwarded += reward;

        // Update requirement for next loop
        requiredXp = getXpForNextLevel(currentLevel);
    }

    // Save to DB (In-memory cache)
    db.updateUser(guildId, userId, {
        xp: currentXp,
        total_xp: totalXp,
        level: currentLevel,
        tokens: tokens,
        last_message_content: content
    });

    return {
        xpGained,
        oldLevel: leveledUp ? oldLevel : null,
        newLevel: leveledUp ? currentLevel : null,
        tokensAwarded
    };
}

module.exports = {
    getXpForNextLevel,
    getTokenReward,
    processMessage
};
