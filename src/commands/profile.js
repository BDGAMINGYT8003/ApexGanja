const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const xpSystem = require('../utils/xpSystem');
const { getProgressBar } = require('../utils/progressBar');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your Apex Grid status.')
        .addUserOption(option => option.setName('user').setDescription('The operator to view')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        let user = db.getUser(interaction.guildId, targetUser.id);

        if (!user) {
            // Check Incomplete
            const incompleteUser = db.getIncompleteUser(interaction.guildId, targetUser.id);
            if (incompleteUser) {
                return interaction.reply({ content: 'Operator signature detected, but authorization is pending (not onboarded).', flags: MessageFlags.Ephemeral });
            }
            return interaction.reply({ content: 'Operator signature not found in the grid.', flags: MessageFlags.Ephemeral });
        }

        const nextXp = xpSystem.getXpForNextLevel(user.level);
        const progressBar = getProgressBar(user.xp, nextXp, 5);

        // Calculate Rank
        const allUsers = db.getAllUsers(interaction.guildId);
        const sorted = Object.values(allUsers).sort((a, b) => b.total_xp - a.total_xp);
        const rank = sorted.findIndex(u => u.id === targetUser.id) + 1;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`Operator Dossier: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Clearance', value: `Level: ${user.level}\nXP Protocol: ${user.xp}/${nextXp}\n${progressBar}`, inline: false },
                { name: 'Calamity Intel', value: `${user.tokens} CI`, inline: true },
                { name: 'Sector Rank', value: `#${rank}`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
