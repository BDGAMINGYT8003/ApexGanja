const cron = require('node-cron');
const db = require('./database');
const logger = require('./logger');

const REWARDS = {
    1: { count: 5, name: 'Starmap Echoes' },
    2: { count: 4, name: 'Starmap Echoes' },
    3: { count: 3, name: 'Starmap Echoes' },
    4: { count: 2, name: 'Starmap Echoes' },
    5: { count: 2, name: 'Starmap Echoes' }
};

function init(client) {
    // 0 0 1 * * = At 00:00 on day-of-month 1.
    cron.schedule('0 0 1 * *', () => {
        logger.event('Executing Monthly Reset...');
        resetRoutine(client);
    });
    logger.info('Scheduler initialized (Monthly Reset).');
}

async function resetRoutine(client) {
    const cache = db.getCache();

    // Iterate over Guilds
    for (const guildId in cache) {
        const users = Object.values(cache[guildId]);

        // 1. Leaderboard Payout
        const sorted = users.sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
        const winners = sorted.slice(0, 5);

        for (let i = 0; i < winners.length; i++) {
            const user = winners[i];
            const rank = i + 1;
            const reward = REWARDS[rank];

            // Only reward if they actually played (total_xp > 0)
            if (reward && user.total_xp > 0) {
                // Generate Code
                const code = `REWARD-RANK${rank}-${Date.now().toString(36).toUpperCase()}`;

                // DM User
                try {
                    const discordUser = await client.users.fetch(user.id);
                    if (discordUser) {
                        await discordUser.send(`**Monthly Reset Rewards**\nCongratulations! You placed #${rank} in the monthly leaderboard.\n\nHere is your code for **${reward.count}x ${reward.name}**:\n\`${code}\``);
                        logger.success(`Sent reward to ${user.id} (Rank ${rank})`);
                    }
                } catch (err) {
                    logger.error(`Failed to DM reward to ${user.id}: ${err.message}`);
                }
            }
        }

        // 2. Reset Data
        users.forEach(u => {
            u.xp = 0;
            u.level = 1; // Reset to Level 1 (Baseline)
            u.total_xp = 0;
            u.tokens = 0;
            u.market_stock = {};
        });

        logger.info(`Reset complete for guild ${guildId}`);
    }

    db.save();
    logger.success('Monthly Reset All Complete.');
}

module.exports = { init };
