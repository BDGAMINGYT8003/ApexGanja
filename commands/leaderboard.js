const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the monthly leaderboard.'),
    async execute(interaction) {
        const allUsers = db.getAllUsers(interaction.guildId);
        const sorted = Object.values(allUsers).sort((a, b) => b.total_xp - a.total_xp);
        const top10 = sorted.slice(0, 10);

        const description = top10.map((u, index) => {
            return `**#${index + 1}** <@${u.id}> — **${u.total_xp} XP**`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Monthly Leaderboard')
            .setDescription(description || 'No data yet.')
            .setFooter({ text: 'Resets on the 1st of every month.' });

        await interaction.reply({ embeds: [embed] });
    }
};
