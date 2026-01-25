const db = require('../utils/database');
const onboarding = require('../utils/onboarding');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // We only care about guild interactions for now
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
            const commandName = interaction.customId.split('_')[0];
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
