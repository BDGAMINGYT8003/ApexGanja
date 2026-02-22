const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

        // 2. Lottery Drawing (Logarithmic Weighting)
        let lotteryParticipants = [];
        let totalTicketsGlobal = 0;
        let totalPoolWeight = 0;

        // Build Weighted Pool
        users.forEach(u => {
            const tickets = u.lottery?.current_tickets || 0;
            if (tickets > 0) {
                totalTicketsGlobal += tickets;
                const weight = Math.log10(tickets + 1) + 1;
                lotteryParticipants.push({
                    id: u.id,
                    tickets: tickets,
                    weight: weight,
                    user: u // reference to user obj
                });
                totalPoolWeight += weight;
            }
        });

        const initialTotalWeight = totalPoolWeight; // Store for stats

        // Select Winners (Weighted Random)
        const lotteryWinners = [];
        const topSpenders = [...lotteryParticipants].sort((a, b) => b.tickets - a.tickets).slice(0, 3);

        if (lotteryParticipants.length > 0) {
            for (let i = 1; i <= 3; i++) {
                if (lotteryParticipants.length === 0) break;

                // Pick a random weight
                let r = Math.random() * totalPoolWeight;
                let winner = null;

                for (const p of lotteryParticipants) {
                    if (r < p.weight) {
                        winner = p;
                        break;
                    }
                    r -= p.weight;
                }

                // Fallback
                if (!winner) winner = lotteryParticipants[lotteryParticipants.length - 1];

                lotteryWinners.push({ rank: i, id: winner.id });

                // Remove winner from participants for next draw (Unique Winners)
                totalPoolWeight -= winner.weight;
                lotteryParticipants = lotteryParticipants.filter(p => p.id !== winner.id);
            }
        }

        // Public Lottery Announcement (if configured)
        const settings = db.getGuildSettings(guildId);
        if (settings.lottery_channel) {
            try {
                const channel = await client.channels.fetch(settings.lottery_channel);
                if (channel && channel.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setColor(0xE91E63) // PRIMARY hardcoded or import
                        .setTitle('Calamity Supply Drop: Monthly Results')
                        .setDescription(
                            `🥇 <@${lotteryWinners.find(w => w.rank === 1)?.id || 'None'}>\n` +
                            `🥈 <@${lotteryWinners.find(w => w.rank === 2)?.id || 'None'}>\n` +
                            `🥉 <@${lotteryWinners.find(w => w.rank === 3)?.id || 'None'}>`
                        )
                        .addFields(
                            {
                                name: 'Winning Rewards',
                                value: `🥇 \`${LOTTERY_PRIZES[1]}\`\n🥈 \`${LOTTERY_PRIZES[2]}\`\n🥉 \`${LOTTERY_PRIZES[3]}\``,
                                inline: false
                            },
                            {
                                name: 'Lottery Stats',
                                value: `- Total Users: \`${users.filter(u => (u.lottery?.current_tickets||0) > 0).length}\`\n- Total Tickets: \`${totalTicketsGlobal}\``,
                                inline: false
                            },
                            {
                                name: 'Top 3 Spenders',
                                value: topSpenders.map(p => {
                                    const winChance = ((p.weight / initialTotalWeight) * 100).toFixed(2);
                                    return `\` ${winChance}% \` \` ${p.tickets * 150} Tokens \` <@${p.id}>`;
                                }).join('\n') || 'None'
                            }
                        )
                        .setFooter({ text: 'Winners drawn via Logarithmic Weighting' });

                    await channel.send({ embeds: [embed] });
                }
            } catch (err) {
                logger.error(`Failed to send lottery announcement in guild ${guildId}: ${err.message}`);
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

        // --- SAVE HISTORY ---
        // Save Leaderboard (Top 50 by Total XP)
        const historyLeaderboard = sorted.slice(0, 50).map(u => ({
            id: u.id,
            total_xp: u.total_xp,
            level: u.level,
            tokens: u.tokens
        }));

        // Save Lottery Results
        const historyLottery = {
            winners: lotteryWinners, // [{ rank: 1, id: ... }, ...]
            total_participants: lotteryParticipants.length + lotteryWinners.length,
            total_tickets: totalTicketsGlobal,
            prizes: LOTTERY_PRIZES
        };

        db.addHistory(guildId, {
            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            leaderboard: historyLeaderboard,
            lottery: historyLottery
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
