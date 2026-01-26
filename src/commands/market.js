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
            const isLottery = item.id === 'lottery_ticket';
            const stockDisplay = isLottery ? 'Stock: ∞' : `Stock: ${remaining}/${item.maxStock}`;

            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(item.name)
                    .setDescription(`Cost: ${item.cost} CI | ${stockDisplay}`)
                    .setValue(item.id)
            );
        });

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleComponent(interaction) {
        const user = db.getUser(interaction.guildId, interaction.user.id);

        // 1. Select Menu
        if (interaction.isStringSelectMenu() && interaction.customId === 'market_select') {
            const itemId = interaction.values[0];
            const item = MARKET_ITEMS.find(i => i.id === itemId);

            // Level Check
            if (item.minLevel > user.level) {
                return interaction.reply({
                    content: `Locked. You must be Level ${item.minLevel} to purchase this item. (Current: ${user.level})`,
                    ephemeral: true
                });
            }

            // Balance Check (Pre-check for at least 1 unit)
            if (user.tokens < item.cost) {
                return interaction.reply({
                    content: `Insufficient Funds. You need at least ${item.cost} CI to purchase this item. (Current: ${user.tokens} CI)`,
                    ephemeral: true
                });
            }

            // Lockout Logic for Lottery
            if (item.id === 'lottery_ticket') {
                const now = new Date();
                const day = now.getUTCDate();
                const lastDay = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();

                // Block if Day 1 (Reset day) OR Last Day of Month (24h before reset)
                if (day === 1 || day === lastDay) {
                    return interaction.reply({
                        content: `Lottery Ticket purchases are locked 24h before and after the monthly reset.`,
                        ephemeral: true
                    });
                }
            }

            // Modal
            const modal = new ModalBuilder()
                .setCustomId(`market:modal:${itemId}`)
                .setTitle(`Purchase ${item.name.substring(0, 30)}`); // Trim title

            const isLottery = item.id === 'lottery_ticket';
            const maxStock = isLottery ? 9999 : (item.maxStock - (user.market_stock[itemId] || 0));

            const quantityInput = new TextInputBuilder()
                .setCustomId('quantity')
                .setLabel('Quantity')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Max: ${isLottery ? 'Unlimited' : maxStock}`)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(quantityInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // 2. Modal Submit
        else if (interaction.isModalSubmit() && interaction.customId.startsWith('market:modal:')) {
            const itemId = interaction.customId.split(':')[2];
            const item = MARKET_ITEMS.find(i => i.id === itemId);
            const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));

            if (isNaN(quantity) || quantity <= 0) {
                return interaction.reply({ content: 'Invalid quantity.', ephemeral: true });
            }

            // Validation
            if (item.minLevel > user.level) {
                return interaction.reply({ content: `Level requirement not met (Level ${item.minLevel}).`, ephemeral: true });
            }

            const isLottery = item.id === 'lottery_ticket';
            if (!isLottery) {
                const bought = user.market_stock[itemId] || 0;
                const remaining = item.maxStock - bought;
                if (quantity > remaining) {
                    return interaction.reply({ content: `Insufficient stock. You only have ${remaining} left.`, ephemeral: true });
                }
            }

            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                return interaction.reply({ content: `Insufficient funds. Cost: ${totalCost} CI. You have: ${user.tokens} CI.`, ephemeral: true });
            }

            // Confirmation Buttons
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('Confirm Purchase')
                .setDescription(`Are you sure you want to buy **${quantity}x ${item.name}** for **${totalCost} CI**?`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`market:confirm:${itemId}:${quantity}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('market:cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ embeds: [embed], components: [row] });
        }

        // 3. Confirm Button
        else if (interaction.isButton() && interaction.customId.startsWith('market:confirm:')) {
            const [_, __, itemId, qtyStr] = interaction.customId.split(':');
            const quantity = parseInt(qtyStr);
            const item = MARKET_ITEMS.find(i => i.id === itemId);

            // Re-validate (race condition check)
            if (item.minLevel > user.level) {
                return interaction.update({ content: 'Level requirement mismatch. Purchase failed.', embeds: [], components: [] });
            }
            const isLottery = item.id === 'lottery_ticket';
            const bought = user.market_stock[itemId] || 0;

            if (!isLottery && (bought + quantity) > item.maxStock) {
                return interaction.update({ content: 'Stock changed. Purchase failed.', embeds: [], components: [] });
            }
            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                 return interaction.update({ content: 'Balance changed. Purchase failed.', embeds: [], components: [] });
            }

            // Execute
            const newBalance = user.tokens - totalCost;
            let updateData = { tokens: newBalance };

            if (isLottery) {
                // Update Lottery Stats
                const lottery = user.lottery || { current_tickets: 0, lifetime_tickets: 0, wins: { first: 0, second: 0, third: 0 }, joined: 0 };
                lottery.current_tickets += quantity;
                lottery.lifetime_tickets += quantity;
                updateData.lottery = lottery;
            } else {
                const newStock = bought + quantity;
                const stockMap = { ...user.market_stock };
                stockMap[itemId] = newStock;
                updateData.market_stock = stockMap;
            }

            db.updateUser(interaction.guildId, interaction.user.id, updateData);

            // Generate Codes
            const codes = [];
            for(let i=0; i<quantity; i++) {
                codes.push(`APEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`);
            }

            const codeString = codes.map(c => `\`${c}\``).join('\n');

            // Success Embed (Public Update)
            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('Purchase Successful')
                .setDescription(`You purchased **${quantity}x ${item.name}**.\n\nCheck your DMs for your redemption codes.`);

            await interaction.update({ embeds: [successEmbed], components: [] });

            // DM User + Safe-Drop Fallback
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('Purchase Successful')
                    .setDescription(`You purchased **${quantity}x ${item.name}**.\n\n**Redemption Codes:**\n${codeString}`);
                await interaction.user.send({ embeds: [dmEmbed] });
            } catch (err) {
                // Safe-Drop: Ephemeral Follow-up
                const safeDropEmbed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('DM Delivery Failed')
                    .setDescription(`Your privacy settings prevented DM delivery.\n\n**Here are your codes (Visible only to you):**\n${codeString}\n\n*Please copy these now.*`);

                await interaction.followUp({ embeds: [safeDropEmbed], ephemeral: true });
            }
        }

        // 4. Cancel Button
        else if (interaction.isButton() && interaction.customId === 'market:cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('Transaction Cancelled')
                .setDescription('The purchase was cancelled.');

            await interaction.update({ embeds: [cancelEmbed], components: [] });
        }
    }
};
