const xpSystem = require('../utils/xpSystem');
const { getProgressBar } = require('../utils/progressBar');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/constants');
const db = require('../utils/database');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Process XP
        const result = xpSystem.processMessage(message.guild.id, message.author.id, message.content);

        if (result && result.newLevel) {
            const timestamp = new Date().toLocaleString('en-US', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(',', ' |');

            const dmEmbed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle('Level up!')
                .setDescription(`> Level up hype, ${message.author.username}! You leveled up from level **${result.oldLevel}** to **${result.newLevel}**`)
                .addFields(
                    { name: 'Rewards', value: `- +${result.tokensAwarded} Calamity Intel (CI) Tokens`, inline: true }
                )
                .setFooter({ text: timestamp });

            try {
                await message.author.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Fallback: Channel Message (simulating ephemeral behavior as roast)
                const fallbackEmbed = new EmbedBuilder()
                    .setColor(COLORS.PRIMARY)
                    .setTitle('Level up!')
                    .setDescription(`> Level up hype, ${message.author.username}! You leveled up from level **${result.oldLevel}** to **${result.newLevel}**\n\n*I couldn't DM you because your privacy settings are locked. Unlock them so I don't have to roast you in public next time.*`)
                    .addFields(
                        { name: 'Rewards', value: `- +${result.tokensAwarded} Calamity Intel (CI) Tokens`, inline: true }
                    )
                    .setFooter({ text: timestamp });

                await message.reply({ embeds: [fallbackEmbed] });
            }
        }
    }
};
