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
            const user = db.getUser(message.guild.id, message.author.id);
            const nextXp = xpSystem.getXpForNextLevel(result.newLevel);
            const progressBar = getProgressBar(user.xp, nextXp, 5);

            const embed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle(`Level Up! ${message.author.username}`)
                .setDescription(`You reached **Level ${result.newLevel}**!`)
                .addFields(
                    { name: 'Rewards', value: `+${result.tokensAwarded} CI Tokens`, inline: true },
                    { name: 'Progress', value: `${progressBar} (${user.xp}/${nextXp} XP)`, inline: false }
                );

            message.channel.send({ embeds: [embed] });
        }
    }
};
