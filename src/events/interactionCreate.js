const db = require('../utils/database');
const onboarding = require('../utils/onboarding');

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // --- Special Handling for DM Interactions (Lottery Claim) ---
        if (!interaction.guildId && interaction.isButton() && interaction.customId.startsWith('lottery:claim')) {
            const rank = interaction.customId.split(':')[2];

            const modal = new ModalBuilder()
                .setCustomId(`lottery:modal:claim:${rank}`)
                .setTitle('Claim Apex Lottery Prize');

            const uidInput = new TextInputBuilder()
                .setCustomId('uid')
                .setLabel('Enter In-Game UID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 12345678')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(uidInput));
            await interaction.showModal(modal);
            return;
        }

        if (!interaction.guildId && interaction.isModalSubmit() && interaction.customId.startsWith('lottery:modal:claim')) {
            const rank = interaction.customId.split(':')[3];
            const uid = interaction.fields.getTextInputValue('uid');

            if (!uid || uid.trim() === '') {
                return interaction.reply({ content: 'UID cannot be empty.', ephemeral: true });
            }

            // Log Claim
            const logDir = path.join(__dirname, '../data');
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
            const logFile = path.join(logDir, 'lottery_claims.json');

            let claims = [];
            if (fs.existsSync(logFile)) {
                try { claims = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch (e) {}
            }
            claims.push({
                date: new Date().toISOString(),
                userId: interaction.user.id,
                rank: parseInt(rank),
                uid: uid
            });
            fs.writeFileSync(logFile, JSON.stringify(claims, null, 2));
            logger.event(`Lottery Claim: User ${interaction.user.id} submitted UID ${uid}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // SUCCESS
                .setTitle('Claim Received')
                .setDescription('Your UID has been recorded. Our game admins/moderators will process your reward and send it to your in-game mailbox shortly.\n\nPlease be patient as this is a manual process.');

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            return;
        }

        // We only care about guild interactions for now (except the above DM logic)
        if (!interaction.guildId) return;

        const user = db.getUser(interaction.guildId, interaction.user.id);

        // Check Onboarding
        // If user is not in DB (and not currently onboarding via component)

        const isOnboardingInteraction = interaction.isButton() && interaction.customId.startsWith('onboard_');

        if (!user && !isOnboardingInteraction) {
             await onboarding.handle(interaction);
             return;
        }

        if (isOnboardingInteraction) {
            await onboarding.handle(interaction);
            return;
        }

        // Handle Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            }
        }
        // Handle Components (Buttons, Selects, Modals)
        else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            // Handle both separators: '_' and ':'
            let commandName = interaction.customId;
            if (commandName.includes(':')) {
                commandName = commandName.split(':')[0];
            } else {
                commandName = commandName.split('_')[0];
            }

            const command = interaction.client.commands.get(commandName);

            if (command && command.handleComponent) {
                try {
                    await command.handleComponent(interaction);
                } catch (error) {
                    console.error(error);
                    // Silent fail or ephemeral error
                    if (!interaction.replied) {
                        await interaction.reply({ content: 'Error processing component.', ephemeral: true });
                    }
                }
            }
        }
    }
};
