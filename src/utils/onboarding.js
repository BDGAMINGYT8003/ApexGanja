const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./database');
const { COLORS } = require('./constants');

const STEPS = {
    START: 0,
    CURRENCY: 1,
    MARKET: 2,
    LOTTERY: 3,
    COMPLETE: 4
};

async function handle(interaction) {
    // If we are handling a component interaction for onboarding
    let step = STEPS.START;

    // Check if we are already in a flow?
    // Since we use ephemeral messages, we can't easily track state across interactions unless we encode it in customId
    // or store it in a temp cache.
    // Let's use customId: 'onboard_step_X'

    if (interaction.isButton() && interaction.customId.startsWith('onboard_')) {
        const parts = interaction.customId.split('_');
        step = parseInt(parts[2]);
    }

    // If user is trying to run a command but is not onboarded
    if (interaction.isChatInputCommand()) {
        step = STEPS.START;
    }

    switch (step) {
        case STEPS.START:
            await sendWelcome(interaction);
            break;
        case STEPS.CURRENCY:
            await sendCurrencyInfo(interaction);
            break;
        case STEPS.MARKET:
            await sendMarketInfo(interaction);
            break;
        case STEPS.LOTTERY:
            await sendLotteryInfo(interaction);
            break;
        case STEPS.COMPLETE:
            await completeOnboarding(interaction);
            break;
    }
}

async function sendWelcome(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Welcome to the Apex Grid, Commander')
        .setDescription('Identity Unverified. To access the Stellari Network, you must undergo mandatory orientation.\n\nLearn how to accrue Calamity Intel, secure resources, and command your Operators.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_1')
            .setLabel('Initiate Orientation')
            .setStyle(ButtonStyle.Primary)
    );

    const payload = { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function sendCurrencyInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Resource Management Protocols')
        .addFields(
            { name: 'Server XP', value: 'Generated via active comms. Resets monthly. Determines your Clearance Level.', inline: true },
            { name: 'Calamity Intel (CI)', value: 'Earn 1 CI per message and additional CI rewards upon leveling up. Used in the Supply Depot.', inline: true }
        )
        .setFooter({ text: 'Protocol 1 of 4' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_2')
            .setLabel('Next: Supply Depot')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function sendMarketInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Supply Depot & Cycle Reset')
        .setDescription('**Cycle Reset:** On the 1st of every month, XP, Clearance Levels, and CI Tokens reset. Utilize resources before the wipe!\n\n**Supply Depot:** Exchange Calamity Intel for Echo Permits and upgrades. Stock is limited per Commander and resets monthly.')
        .setFooter({ text: 'Protocol 2 of 4' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_3')
            .setLabel('Next: Supply Drop')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function sendLotteryInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Calamity Supply Drop')
        .setDescription('Participate in the monthly Supply Drop to secure high-value assets!\n\n- Acquire tickets in the Supply Depot.\n- 3 Commanders are selected via RNG at the cycle end.\n- Acquisitions locked 24h pre/post reset.')
        .setFooter({ text: 'Protocol 3 of 4' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_4')
            .setLabel('Confirm Authorization')
            .setStyle(ButtonStyle.Success)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function completeOnboarding(interaction) {
    // Migrate or Create User
    db.migrateToComplete(interaction.guildId, interaction.user.id);
    db.save(); // Force save to be safe

    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Authorization Confirmed')
        .setDescription('You are now registered in the Apex Grid. Good luck, Commander.');

    await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { handle };
