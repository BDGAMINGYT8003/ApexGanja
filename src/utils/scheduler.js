const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const logger = require('./logger');

const REWARDS = {
    1: { count: 5, name: 'Starmap Echoes' },
    2: { count: 4, name: 'Starmap Echoes' },
    3: { count: 3, name: 'Starmap Echoes' },
    4: { count: 2, name: 'Starmap Echoes' },
    5: { count: 2, name: 'Starmap Echoes' }
};

const LOTTERY_PRIZES = {
    1: 'Ultra Rare Apex Girls In-Game Item',
    2: 'Rare Apex Girls In-Game Item',
    3: 'Uncommon Apex Girls In-Game Item'
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
    // Reset COMPLETE users
    const allUsers = db.getAllUsers('global'); // Wait, getAllUsers takes guildId. We need to iterate the raw cache for resetting ALL guilds.
    // The previous code: `const cache = db.getCache();` returns the raw cache { complete: {...}, incomplete: {...} }?
    // Let's check `getCache` implementation in `database.js`.
    // It returns `cache`. `cache` is `{ complete: {}, incomplete: {} }`.
    // The previous implementation of resetRoutine iterated `cache[guildId]`.
    // But `cache` now has structure `cache.complete[guildId]` and `cache.incomplete[guildId]`.
    // We need to fix this loop.

    const rawCache = db.getCache();

    // Iterate Complete Users
    for (const guildId in rawCache.complete) {
        const users = Object.values(rawCache.complete[guildId]);

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
                    // Fallback: Log to file
                    const logDir = path.join(__dirname, '../../logs');
                    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
                    const logFile = path.join(logDir, 'rewards.json');

                    let logs = [];
                    if (fs.existsSync(logFile)) {
                        try {
                            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                        } catch (e) {}
                    }
                    logs.push({
                        date: new Date().toISOString(),
                        userId: user.id,
                        rank: rank,
                        prize: reward.name,
                        code: code,
                        error: err.message
                    });
                    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
                    logger.warn(`Logged reward for ${user.id} to logs/rewards.json due to DM failure.`);
                }
            }
        }

        // 2. Lottery Drawing
        // Build Pool
        const lotteryPool = [];
        const lotteryParticipants = [];

        users.forEach(u => {
            if (u.lottery && u.lottery.current_tickets > 0) {
                lotteryParticipants.push(u);
                for(let k=0; k < u.lottery.current_tickets; k++) {
                    lotteryPool.push(u.id);
                }
            }
        });

        // Select Winners
        const lotteryWinners = [];
        if (lotteryPool.length > 0) {
            for (let i = 1; i <= 3; i++) {
                if (lotteryPool.length === 0) break;

                const winIndex = Math.floor(Math.random() * lotteryPool.length);
                const winnerId = lotteryPool[winIndex];
                lotteryWinners.push({ rank: i, id: winnerId });

                // Remove all instances of this winner from pool (Unique Winners)
                let newPool = [];
                for(let j=0; j<lotteryPool.length; j++) {
                    if (lotteryPool[j] !== winnerId) newPool.push(lotteryPool[j]);
                }
                // Update pool via splice/filter is cleaner but this works
                // Actually filter is better
                // lotteryPool = lotteryPool.filter(id => id !== winnerId); // Cannot assign to const
                // We must use a loop or reassign logic if pool was let.

                // Let's iterate backwards to splice
                for (let k = lotteryPool.length - 1; k >= 0; k--) {
                    if (lotteryPool[k] === winnerId) {
                        lotteryPool.splice(k, 1);
                    }
                }
            }
        }

        // Process Lottery Winners
        for (const win of lotteryWinners) {
            const prizeName = LOTTERY_PRIZES[win.rank];

            // Update User Stats (Wins)
            const winnerUser = users.find(u => u.id === win.id);
            if (winnerUser) {
                if (!winnerUser.lottery.wins) winnerUser.lottery.wins = { first: 0, second: 0, third: 0 };

                if (win.rank === 1) winnerUser.lottery.wins.first++;
                if (win.rank === 2) winnerUser.lottery.wins.second++;
                if (win.rank === 3) winnerUser.lottery.wins.third++;

                // DM with Claim Embed
                try {
                    const discordUser = await client.users.fetch(win.id);
                    if (discordUser) {
                        const rankStr = win.rank === 1 ? '1st' : win.rank === 2 ? '2nd' : '3rd';
                        const claimEmbed = new EmbedBuilder()
                            .setColor(0xE91E63) // PRIMARY
                            .setTitle('Apex Girls Monthly Lottery')
                            .setDescription(`🎉 **Congratulations!** 🎉\n\nYou have won **${rankStr} Place** in this month's Apex Lottery!\n\n**Prize:** ${prizeName}\n\nTo receive your in-game reward, please click the "Claim Reward" button below and enter your In-Game UID.`)
                            .setFooter({ text: 'Apex Girls Universe' });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`lottery:claim:${win.rank}`)
                                .setLabel('Claim Reward')
                                .setStyle(ButtonStyle.Secondary), // Gray
                            new ButtonBuilder()
                                .setLabel('Official Website')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://apexgirlsen.neorigin.com/')
                        );

                        await discordUser.send({ embeds: [claimEmbed], components: [row] });
                        logger.success(`Sent lottery prize DM to ${win.id} (Rank ${win.rank})`);
                    }
                } catch (err) {
                    logger.error(`Failed to DM lottery prize to ${win.id}: ${err.message}`);
                    // Should we fallback log here? The prompt implies "Lottery winners submit UIDs", so without DM they can't submit.
                    // But we should log it so admins know they won but didn't get DM.
                    const logDir = path.join(__dirname, '../../logs');
                    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
                    const logFile = path.join(logDir, 'lottery_fails.json');

                    let logs = [];
                    if (fs.existsSync(logFile)) {
                        try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch (e) {}
                    }
                    logs.push({ date: new Date().toISOString(), userId: win.id, rank: win.rank, error: err.message });
                    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
                }
            }
        }

        // Update Lottery Lifetime Stats (Joined) & Reset Current Tickets
        lotteryParticipants.forEach(u => {
            if (!u.lottery.joined) u.lottery.joined = 0;
            u.lottery.joined++;
            u.lottery.current_tickets = 0; // Reset tickets
        });

        // 3. Reset Data (General - Complete Users)
        users.forEach(u => {
            u.xp = 0;
            u.level = 1;
            u.total_xp = 0;
            u.tokens = 0;
            u.market_stock = {};
            if (u.lottery) u.lottery.current_tickets = 0;
        });

        logger.info(`Reset complete users for guild ${guildId}`);
    }

    // Iterate Incomplete Users
    for (const guildId in rawCache.incomplete) {
        const users = Object.values(rawCache.incomplete[guildId]);
        users.forEach(u => {
            u.xp = 0;
            u.level = 1;
            u.total_xp = 0;
            u.tokens = 0;
            // Incomplete users don't have market_stock or lottery usually, but if they did, reset.
            if (u.market_stock) u.market_stock = {};
            if (u.lottery) u.lottery.current_tickets = 0;
        });
        logger.info(`Reset incomplete users for guild ${guildId}`);
    }

    db.save();
    logger.success('Monthly Reset All Complete.');
}

module.exports = { init };
