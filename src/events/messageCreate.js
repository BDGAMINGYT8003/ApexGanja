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

        // Only notify if user is fully onboarded (notify flag is true)
        if (result && result.newLevel && result.notify) {
            const nextXp = xpSystem.getXpForNextLevel(result.newLevel);
            const progressBar = getProgressBar(result.currentXp, nextXp, 5);

            const timestamp = new Date().toLocaleString('en-US', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(',', ' |');

            const dmEmbed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle('Clearance Level Increased')
                .setDescription(`> Clearance updated for Agent ${message.author.username}. Level: **${result.oldLevel}** -> **${result.newLevel}**`)
                .addFields(
                    { name: 'Acquisitions', value: `- +${result.tokensAwarded} Calamity Intel (CI)`, inline: true },
                    { name: 'Next Clearance Protocol', value: `${progressBar} (${result.currentXp}/${nextXp} XP)`, inline: false }
                )
                .setFooter({ text: timestamp });

            try {
                await message.author.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Fallback: Channel Message (simulating ephemeral behavior as roast)
                const fallbackEmbed = new EmbedBuilder()
                    .setColor(COLORS.PRIMARY)
                    .setTitle('Clearance Level Increased')
                    .setDescription(`> Clearance updated for Agent ${message.author.username}. Level: **${result.oldLevel}** -> **${result.newLevel}**\n\n*Secure channel (DM) failed. Adjust privacy protocols to avoid public transmission.*`)
                    .addFields(
                        { name: 'Acquisitions', value: `- +${result.tokensAwarded} Calamity Intel (CI)`, inline: true },
                        { name: 'Next Clearance Protocol', value: `${progressBar} (${result.currentXp}/${nextXp} XP)`, inline: false }
                    )
                    .setFooter({ text: timestamp });

                await message.reply({ embeds: [fallbackEmbed] });
            }
        }
    }
};
