const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('View status of the Calamity Supply Drop.'),
    async execute(interaction) {
        const user = db.getUser(interaction.guildId, interaction.user.id);
        if (!user) return interaction.reply({ content: 'Operator Dossier not found.', flags: MessageFlags.Ephemeral });

        const allUsers = db.getAllUsers(interaction.guildId);
        const users = Object.values(allUsers);

        // Calculate Global Stats
        let totalTickets = 0;
        let totalUnique = 0;

        users.forEach(u => {
            const t = u.lottery?.current_tickets || 0;
            if (t > 0) {
                totalTickets += t;
                totalUnique++;
            }
        });

        // User Stats
        const userTickets = user.lottery?.current_tickets || 0;
        const userLifetime = user.lottery?.lifetime_tickets || 0;
        const wins = user.lottery?.wins || { first: 0, second: 0, third: 0 };
        const joined = user.lottery?.joined || 0;

        const winChance = totalTickets > 0 ? ((userTickets / totalTickets) * 100).toFixed(2) : '0.00';

        // End Timestamp (End of current month)
        const now = new Date();
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
        const timestamp = Math.floor(endOfMonth.getTime() / 1000);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Calamity Supply Drop')
            .setDescription(
                `- Acquire entries via the Supply Depot to increase acquisition probability.\n` +
                `- Acquisitions locked **24 hours pre/post** cycle reset.\n\n` +
                `:ticket: **Cost**: 150 CI (Use \`/market\` to acquire)\n\n` +
                `:bar_chart: **Your Acquisition Stats**\n` +
                `:first_place: :second_place: :third_place: Wins: \`${wins.first}/${wins.second}/${wins.third}\`\n` +
                `Drops Joined: \`${joined}\`\n` +
                `:ticket: Lifetime Entries: \`${userLifetime}\``
            )
            .addFields(
                { name: 'Current Cache Content', value: '**1st:** `[Ultra Rare Stellaris Component]`\n**2nd:** `[Rare Echo Permit]`\n**3rd:** `[Uncommon Resource Pack]`', inline: false },
                { name: 'Drop Incoming', value: `:alarm_clock: <t:${timestamp}:R>`, inline: true },
                { name: 'Active Agents', value: `:busts_in_silhouette: ${totalUnique}`, inline: true },
                { name: 'Your Entries', value: `:ticket: ${userTickets}`, inline: true },
                { name: 'Acquisition Probability', value: `:chart_with_upwards_trend: ${winChance}%`, inline: true },
                { name: 'Total Pool', value: `:bar_chart: ${totalTickets}`, inline: true }
            )
            .setFooter({ text: 'Supply Drop distributed via RNG at the end of every cycle.' });

        await interaction.reply({ embeds: [embed] });
    }
};
