const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const db = require('../utils/database');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        logger.info('Ready event triggered.');
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

        const rest = new REST({ version: '10' }).setToken(client.token);

        try {
            logger.info(`Started refreshing global application (/) commands for App ID: ${client.user.id}`);
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands },
            );
            logger.success('Successfully reloaded global application (/) commands.');
        } catch (error) {
            logger.error('Failed to deploy commands: ' + error.message);
        }
    }
};
