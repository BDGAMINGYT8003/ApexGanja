const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const db = require('../utils/database');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.success(`Logged in as ${client.user.tag}!`);

        // Init DB
        db.load();
        db.startAutosave();

        // Deploy Commands
        const commands = [];
        client.commands.forEach(cmd => {
            if (cmd.data) {
                commands.push(cmd.data.toJSON());
                logger.cmd(`Loaded command: ${cmd.data.name}`);
            }
        });

        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

        try {
            logger.info('Started refreshing global application (/) commands.');
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            logger.success('Successfully reloaded global application (/) commands.');
        } catch (error) {
            logger.error('Failed to deploy commands: ' + error.message);
        }
    }
};
