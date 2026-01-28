const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configure notification channels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set a channel for specific notifications.')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('The notification category.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Level Up Notifications', value: 'levelUp' },
                            { name: 'Lottery Announcements', value: 'lottery' }
                        )
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to set.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'channel') {
            const category = interaction.options.getString('category');
            const channel = interaction.options.getChannel('channel');

            let dbKey;
            let categoryName;

            if (category === 'levelUp') {
                dbKey = 'levelUpChannelId';
                categoryName = 'Level Up Notifications';
            } else if (category === 'lottery') {
                dbKey = 'lotteryChannelId';
                categoryName = 'Lottery Announcements';
            }

            db.updateSettings(interaction.guildId, dbKey, channel.id);
            // Autosave will handle persistence, or we can force save if critical.
            // db.save() is on 60s timer, which is fine.

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('Communication Protocol Established')
                .setDescription(`> **Category:** ${categoryName}\n> **Target Frequency:** <#${channel.id}>\n\nConfiguration successfully overwritten. Transmission lines secure.`)
                .setFooter({ text: 'Apex Girls | System Configuration' });

            await interaction.reply({ embeds: [embed] });
        }
    }
};
