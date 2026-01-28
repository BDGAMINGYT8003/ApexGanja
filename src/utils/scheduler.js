const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const logger = require('./logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLORS } = require('./constants');

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

function calculateWeight(tickets) {
    if (tickets <= 0) return 0;
    return Math.log10(tickets + 1) + 1;
}

function init(client) {
    // 0 0 1 * * = At 00:00 on day-of-month 1.
    cron.schedule('0 0 1 * *', () => {
        logger.event('Executing Monthly Reset...');
        resetRoutine(client);
    });
    logger.info('Scheduler initialized (Monthly Reset).');
}

async function resetRoutine(client) {
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

        // 2. Lottery Drawing (Logarithmic)
        const lotteryParticipants = [];
        let totalGlobalTickets = 0;

        users.forEach(u => {
            if (u.lottery && u.lottery.current_tickets > 0) {
                lotteryParticipants.push(u);
                totalGlobalTickets += u.lottery.current_tickets;
            }
        });

        // Select Winners
        const lotteryWinners = [];

        // Clone for safe manipulation
        let currentPool = [...lotteryParticipants];

        for (let i = 1; i <= 3; i++) {
            if (currentPool.length === 0) break;

            // Calculate Total Weight for current pool
            let totalWeight = 0;
            currentPool.forEach(u => {
                totalWeight += calculateWeight(u.lottery.current_tickets);
            });

            // Random Pick
            let random = Math.random() * totalWeight;
            let selectedUser = null;
            let accumulatedWeight = 0;

            for (const user of currentPool) {
                accumulatedWeight += calculateWeight(user.lottery.current_tickets);
                if (accumulatedWeight >= random) {
                    selectedUser = user;
                    break;
                }
            }

            // Fallback (rounding errors)
            if (!selectedUser) selectedUser = currentPool[currentPool.length - 1];

            const userWeight = calculateWeight(selectedUser.lottery.current_tickets);
            const winChance = ((userWeight / totalWeight) * 100).toFixed(2);

            lotteryWinners.push({ rank: i, id: selectedUser.id, user: selectedUser, chance: winChance });

            // Remove winner from pool to ensure unique winners
            currentPool = currentPool.filter(u => u.id !== selectedUser.id);
        }

        // Process Lottery Winners (Notifications)
        for (const win of lotteryWinners) {
            const prizeName = LOTTERY_PRIZES[win.rank];

            // Update User Stats (Wins)
            // Use find in original array to update DB reference
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
                        const embed = new EmbedBuilder()
                            .setColor(COLORS.PRIMARY)
                            .setTitle('Calamity Supply Drop: Acquisition Confirmed')
                            .setDescription(`Attention Commander,\n\nYou have been selected as the **${win.rank === 1 ? '1st' : win.rank === 2 ? '2nd' : '3rd'} Place** recipient in this cycle's Calamity Supply Drop.\n\n**Acquired Asset:** ${prizeName}\n\nTo secure this asset, you must verify your identity by providing your In-Game UID via the secure channel below.`)
                            .setFooter({ text: 'Apex Girls | Supply Drop Distribution' });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('lottery:claim')
                                .setLabel('Claim Asset')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setLabel('Stellari Network')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://apexgirlsen.neorigin.com/')
                        );

                        await discordUser.send({ embeds: [embed], components: [row] });
                        logger.success(`Sent lottery prize DM to ${win.id} (Rank ${win.rank})`);
                    }
                } catch (err) {
                    logger.error(`Failed to DM lottery prize to ${win.id}: ${err.message}`);
                }
            }
        }

        // Public Announcement
        const settings = db.getSettings(guildId);
        if (settings && settings.lotteryChannelId && lotteryWinners.length > 0) {
             try {
                const channel = await client.channels.fetch(settings.lotteryChannelId);
                 if (channel && channel.guild.id === guildId && channel.permissionsFor(client.user).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {

                    // Top Spenders logic
                    // Sort participants by tickets spent (desc)
                    const topSpenders = [...lotteryParticipants].sort((a, b) => b.lottery.current_tickets - a.lottery.current_tickets).slice(0, 3);

                    // Total Weight of ALL participants
                    let globalTotalWeight = 0;
                    lotteryParticipants.forEach(u => globalTotalWeight += calculateWeight(u.lottery.current_tickets));

                    const spendersField = topSpenders.map(u => {
                         const weight = calculateWeight(u.lottery.current_tickets);
                         const percent = ((weight / globalTotalWeight) * 100).toFixed(2);
                         // Assuming 'tokens spent' is approximate based on ticket cost (150 CI)
                         // But request says "Tokens_Spent", let's calculate: tickets * 150
                         const spent = u.lottery.current_tickets * 150;
                         return `\` ${percent}% \` \` ${spent} Tokens \` <@${u.id}>`;
                    }).join('\n') || 'None';

                    const first = lotteryWinners.find(w => w.rank === 1);
                    const second = lotteryWinners.find(w => w.rank === 2);
                    const third = lotteryWinners.find(w => w.rank === 3);

                    const embed = new EmbedBuilder()
                        .setColor(COLORS.PRIMARY)
                        .setTitle('Calamity Supply Drop: Cycle Conclusion')
                        .setDescription(
                            `> 🥇 ${first ? `<@${first.id}>` : 'N/A'}\n` +
                            `> 🥈 ${second ? `<@${second.id}>` : 'N/A'}\n` +
                            `> 🥉 ${third ? `<@${third.id}>` : 'N/A'}`
                        )
                        .addFields(
                            {
                                name: 'Winning Assets',
                                value: `> - 🥇 \`${LOTTERY_PRIZES[1]}\`\n> - 🥈 \`${LOTTERY_PRIZES[2]}\`\n> - 🥉 \`${LOTTERY_PRIZES[3]}\``
                            },
                            {
                                name: 'Acquisition Probability',
                                value: `> - 🥇 \`${first ? first.chance : '0'}%\`\n> - 🥈 \`${second ? second.chance : '0'}%\`\n> - 🥉 \`${third ? third.chance : '0'}%\``
                            },
                            {
                                name: 'Supply Statistics',
                                value: `> - Total Agents: \`${lotteryParticipants.length}\`\n> - Total Entries: \`${totalGlobalTickets}\``
                            },
                            {
                                name: 'Top Contributors',
                                value: spendersField
                            }
                        )
                        .setFooter({ text: new Date().toISOString() });

                    await channel.send({ embeds: [embed] });
                 }
             } catch (err) {
                 logger.error('Failed to send public lottery announcement: ' + err.message);
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

module.exports = { init, calculateWeight };
