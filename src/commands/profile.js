const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const xpSystem = require('../utils/xpSystem');
const { getProgressBar } = require('../utils/progressBar');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your Apex Grid stats.')
        .addUserOption(option => option.setName('user').setDescription('The user to view')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const user = db.getUser(interaction.guildId, targetUser.id);

        if (!user) {
            return interaction.reply({ content: 'User not found in the database.', ephemeral: true });
        }

        const nextXp = xpSystem.getXpForNextLevel(user.level);
        const progressBar = getProgressBar(user.xp, nextXp, 5);

        // Calculate Rank
        const allUsers = db.getAllUsers(interaction.guildId);
        const sorted = Object.values(allUsers).sort((a, b) => b.total_xp - a.total_xp);
        const rank = sorted.findIndex(u => u.id === targetUser.id) + 1;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`Agent Profile: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Level', value: `Level: ${user.level}\nExperience: ${user.xp}/${nextXp}\n${progressBar}`, inline: false },
                { name: 'CI Tokens', value: `${user.tokens}`, inline: true },
                { name: 'Rank', value: `#${rank}`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
