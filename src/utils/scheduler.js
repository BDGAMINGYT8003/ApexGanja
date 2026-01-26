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
            const code = `LOTTERY-${win.rank}-${Date.now().toString(36).toUpperCase()}`;

            // Update User Stats (Wins)
            const winnerUser = users.find(u => u.id === win.id);
            if (winnerUser) {
                if (!winnerUser.lottery.wins) winnerUser.lottery.wins = { first: 0, second: 0, third: 0 };

                if (win.rank === 1) winnerUser.lottery.wins.first++;
                if (win.rank === 2) winnerUser.lottery.wins.second++;
                if (win.rank === 3) winnerUser.lottery.wins.third++;

                // DM
                try {
                    const discordUser = await client.users.fetch(win.id);
                    if (discordUser) {
                        await discordUser.send(`**Apex Monthly Lottery Winner!**\n\nCongratulations! You won **${win.rank === 1 ? '1st' : win.rank === 2 ? '2nd' : '3rd'} Place** in this month's lottery!\n\nPrize: **${prizeName}**\nCode: \`${code}\``);
                        logger.success(`Sent lottery prize to ${win.id} (Rank ${win.rank})`);
                    }
                } catch (err) {
                    logger.error(`Failed to DM lottery prize to ${win.id}: ${err.message}`);
                }
            }
        }

        // Update Lottery Lifetime Stats (Joined) & Reset Current Tickets
        lotteryParticipants.forEach(u => {
            if (!u.lottery.joined) u.lottery.joined = 0;
            u.lottery.joined++;
            u.lottery.current_tickets = 0; // Reset tickets
        });

        // 3. Reset Data (General)
        users.forEach(u => {
            u.xp = 0;
            u.level = 1; // Reset to Level 1 (Baseline)
            u.total_xp = 0;
            u.tokens = 0;
            u.market_stock = {};
            // Note: Lottery tickets were reset above for participants.
            // Ensure non-participants (who might have 0 tickets but data exists) are fine.
            // If they didn't participate, current_tickets is 0 already.
            // Safety reset just in case:
            if (u.lottery) u.lottery.current_tickets = 0;
        });

        logger.info(`Reset complete for guild ${guildId}`);
    }

    db.save();
    logger.success('Monthly Reset All Complete.');
}

module.exports = { init };
