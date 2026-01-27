const { MessageFlags } = require('discord.js');
const db = require('../utils/database');
const onboarding = require('../utils/onboarding');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Allow DM interactions for specific flows (e.g., Lottery Claims)
        const isDMInteraction = !interaction.guildId;
        const isLotteryFlow = interaction.customId && interaction.customId.startsWith('lottery:');

        // We only care about guild interactions for now (except special flows)
        if (isDMInteraction && !isLotteryFlow) return;

        const user = interaction.guildId ? db.getUser(interaction.guildId, interaction.user.id) : null;

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
                    await interaction.followUp({ content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral });
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
                        await interaction.reply({ content: 'Error processing component.', flags: MessageFlags.Ephemeral });
                    }
                }
            }
        }
    }
};
