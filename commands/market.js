const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const { COLORS, MARKET_ITEMS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Open the Apex Market.'),

    async execute(interaction) {
        const user = db.getUser(interaction.guildId, interaction.user.id);
        if (!user) return interaction.reply({ content: 'Profile not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Apex Market Store')
            .setDescription(`**Your Balance:** ${user.tokens} CI Tokens\n\nSelect an item below to purchase.`);

        // Create Select Menu
        const select = new StringSelectMenuBuilder()
            .setCustomId('market_select')
            .setPlaceholder('Select an item...');

        MARKET_ITEMS.forEach(item => {
            // Check stock
            const bought = user.market_stock[item.id] || 0;
            const remaining = item.maxStock - bought;

            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(item.name)
                    .setDescription(`Cost: ${item.cost} CI | Stock: ${remaining}/${item.maxStock}`)
                    .setValue(item.id)
            );
        });

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleComponent(interaction) {
        const user = db.getUser(interaction.guildId, interaction.user.id);

        // 1. Select Menu
        if (interaction.isStringSelectMenu() && interaction.customId === 'market_select') {
            const itemId = interaction.values[0];
            const item = MARKET_ITEMS.find(i => i.id === itemId);

            // Modal
            const modal = new ModalBuilder()
                .setCustomId(`market_modal_${itemId}`)
                .setTitle(`Purchase ${item.name.substring(0, 30)}`); // Trim title

            const quantityInput = new TextInputBuilder()
                .setCustomId('quantity')
                .setLabel('Quantity')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Max: ${item.maxStock - (user.market_stock[itemId] || 0)}`)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(quantityInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // 2. Modal Submit
        else if (interaction.isModalSubmit() && interaction.customId.startsWith('market_modal_')) {
            const itemId = interaction.customId.split('_')[2];
            const item = MARKET_ITEMS.find(i => i.id === itemId);
            const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));

            if (isNaN(quantity) || quantity <= 0) {
                return interaction.reply({ content: 'Invalid quantity.', ephemeral: true });
            }

            // Validation
            const bought = user.market_stock[itemId] || 0;
            const remaining = item.maxStock - bought;
            if (quantity > remaining) {
                return interaction.reply({ content: `Insufficient stock. You only have ${remaining} left.`, ephemeral: true });
            }

            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                return interaction.reply({ content: `Insufficient funds. Cost: ${totalCost} CI. You have: ${user.tokens} CI.`, ephemeral: true });
            }

            // Confirmation Buttons
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('Confirm Purchase')
                .setDescription(`Item: **${item.name}**\nQuantity: **${quantity}**\nTotal Cost: **${totalCost} CI**`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`market_confirm_${itemId}_${quantity}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('market_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // 3. Confirm Button
        else if (interaction.isButton() && interaction.customId.startsWith('market_confirm_')) {
            const [_, __, itemId, qtyStr] = interaction.customId.split('_');
            const quantity = parseInt(qtyStr);
            const item = MARKET_ITEMS.find(i => i.id === itemId);

            // Re-validate (race condition check)
            const bought = user.market_stock[itemId] || 0;
            if ((bought + quantity) > item.maxStock) {
                return interaction.update({ content: 'Stock changed. Purchase failed.', embeds: [], components: [] });
            }
            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                 return interaction.update({ content: 'Balance changed. Purchase failed.', embeds: [], components: [] });
            }

            // Execute
            const newStock = bought + quantity;
            const newBalance = user.tokens - totalCost;

            const stockMap = { ...user.market_stock };
            stockMap[itemId] = newStock;

            db.updateUser(interaction.guildId, interaction.user.id, {
                tokens: newBalance,
                market_stock: stockMap
            });

            // Generate Codes
            const codes = [];
            for(let i=0; i<quantity; i++) {
                codes.push(`APEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`);
            }

            const codeString = codes.map(c => `\`${c}\``).join('\n');

            // DM User
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('Purchase Successful')
                    .setDescription(`You purchased **${quantity}x ${item.name}**.\n\n**Redemption Codes:**\n${codeString}`);
                await interaction.user.send({ embeds: [dmEmbed] });
            } catch (err) {
                // DM failed
            }

            // Ephemeral Reply
            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('Purchase Successful')
                .setDescription(`You purchased **${quantity}x ${item.name}**.\n\n**Redemption Codes:**\n${codeString}\n\n*Please copy these codes immediately. They have also been sent to your DMs.*`);

            await interaction.update({ embeds: [successEmbed], components: [] });
        }

        // 4. Cancel Button
        else if (interaction.isButton() && interaction.customId === 'market_cancel') {
            await interaction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
        }
    }
};
