const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const { COLORS, MARKET_ITEMS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Access the Supply Depot.'),

    async execute(interaction) {
        const user = db.getUser(interaction.guildId, interaction.user.id);
        if (!user) return interaction.reply({ content: 'Operator Dossier not found.', flags: MessageFlags.Ephemeral });

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Supply Depot')
            .setDescription(`**Available Resources:** ${user.tokens} Calamity Intel (CI)\n\nSelect an acquisition below.`);

        // Create Select Menu
        const select = new StringSelectMenuBuilder()
            .setCustomId('market_select')
            .setPlaceholder('Select Acquisition...');

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
                    content: `Clearance Insufficient. Level ${item.minLevel} required. (Current: ${user.level})`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Balance Check (Pre-check for at least 1 unit)
            if (user.tokens < item.cost) {
                return interaction.reply({
                    content: `Insufficient Resources. Requirement: ${item.cost} CI. (Current: ${user.tokens} CI)`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Stock Check (Pre-check)
            if (item.id !== 'lottery_ticket') {
                const bought = user.market_stock[item.id] || 0;
                if (bought >= item.maxStock) {
                    return interaction.reply({
                        content: `Stock Depleted. Monthly ration limit reached (${item.maxStock}).`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Lockout Logic for Lottery
            if (item.id === 'lottery_ticket') {
                const now = new Date();
                const day = now.getUTCDate();
                const lastDay = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();

                // Block if Day 1 (Reset day) OR Last Day of Month (24h before reset)
                if (day === 1 || day === lastDay) {
                    return interaction.reply({
                        content: `Supply Drop entries locked 24h pre/post cycle reset.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Modal
            const modal = new ModalBuilder()
                .setCustomId(`market:modal:${itemId}:${interaction.message.id}`)
                .setTitle(`Acquire ${item.name.substring(0, 30)}`); // Trim title

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
            const parts = interaction.customId.split(':');
            const itemId = parts[2];
            const originalMsgId = parts[3];
            const item = MARKET_ITEMS.find(i => i.id === itemId);
            const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));

            if (isNaN(quantity) || quantity <= 0) {
                return interaction.reply({ content: 'Invalid quantity.', flags: MessageFlags.Ephemeral });
            }

            // Validation
            if (item.minLevel > user.level) {
                return interaction.reply({ content: `Clearance mismatch (Level ${item.minLevel}).`, flags: MessageFlags.Ephemeral });
            }

            const isLottery = item.id === 'lottery_ticket';
            if (!isLottery) {
                const bought = user.market_stock[itemId] || 0;
                const remaining = item.maxStock - bought;
                if (quantity > remaining) {
                    return interaction.reply({ content: `Insufficient stock. Remaining: ${remaining}.`, flags: MessageFlags.Ephemeral });
                }
            }

            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                return interaction.reply({ content: `Insufficient funds. Cost: ${totalCost} CI. Available: ${user.tokens} CI.`, flags: MessageFlags.Ephemeral });
            }

            // Confirmation Buttons
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('Confirm Acquisition')
                .setDescription(`Confirm purchase of **${quantity}x ${item.name.replace(/ x\d+$/, '')}** for **${totalCost} CI**?`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`market:confirm:${itemId}:${quantity}:${originalMsgId}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('market:cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // 3. Confirm Button
        else if (interaction.isButton() && interaction.customId.startsWith('market:confirm:')) {
            const parts = interaction.customId.split(':');
            const itemId = parts[2];
            const qtyStr = parts[3];
            const originalMsgId = parts[4];
            const quantity = parseInt(qtyStr);
            const item = MARKET_ITEMS.find(i => i.id === itemId);

            // Re-validate (race condition check)
            if (item.minLevel > user.level) {
                return interaction.update({ content: 'Clearance mismatch. Transaction aborted.', embeds: [], components: [] });
            }
            const isLottery = item.id === 'lottery_ticket';
            const bought = user.market_stock[itemId] || 0;

            if (!isLottery && (bought + quantity) > item.maxStock) {
                return interaction.update({ content: 'Stock mismatch. Transaction aborted.', embeds: [], components: [] });
            }
            const totalCost = item.cost * quantity;
            if (user.tokens < totalCost) {
                 return interaction.update({ content: 'Balance mismatch. Transaction aborted.', embeds: [], components: [] });
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
            let successDescription = '';
            if (isLottery) {
                successDescription = `Acquired **${quantity}x Supply Drop Entry**. Check status via \`/lottery\`.`;
            } else {
                successDescription = `Acquired **${quantity}x ${item.name.replace(/ x\d+$/, '')}**.\n\nCheck secure channel (DM) for codes.`;
            }

            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('Acquisition Confirmed')
                .setDescription(successDescription);

            await interaction.update({ embeds: [successEmbed], components: [] });

            // DM User + Safe-Drop Fallback (Only for non-Lottery items)
            if (!isLottery) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('Acquisition Confirmed')
                        .setDescription(`Acquired **${quantity}x ${item.name.replace(/ x\d+$/, '')}**.\n\n**Access Codes:**\n${codeString}`);
                    await interaction.user.send({ embeds: [dmEmbed] });
                } catch (err) {
                    // Safe-Drop: Ephemeral Follow-up
                    const safeDropEmbed = new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle('Secure Channel Failed')
                        .setDescription(`Privacy settings blocked transmission.\n\n**Access Codes (Restricted View):**\n${codeString}\n\n*Copy immediately.*`);

                    await interaction.followUp({ embeds: [safeDropEmbed], flags: MessageFlags.Ephemeral });
                }
            }

            // Update Original Menu (Dynamic Sync)
            if (originalMsgId) {
                try {
                    const originalMsg = await interaction.channel.messages.fetch(originalMsgId);
                    if (originalMsg && originalMsg.editable) {
                        const updatedUser = db.getUser(interaction.guildId, interaction.user.id);
                        // Re-render Select Menu
                        const select = new StringSelectMenuBuilder()
                            .setCustomId('market_select')
                            .setPlaceholder('Select Acquisition...');

                        MARKET_ITEMS.forEach(i => {
                            const bought = updatedUser.market_stock[i.id] || 0;
                            const remaining = i.maxStock - bought;
                            const isLot = i.id === 'lottery_ticket';
                            const stockDisplay = isLot ? 'Stock: ∞' : `Stock: ${remaining}/${i.maxStock}`;

                            select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(i.name)
                                    .setDescription(`Cost: ${i.cost} CI | ${stockDisplay}`)
                                    .setValue(i.id)
                            );
                        });

                        const row = new ActionRowBuilder().addComponents(select);
                        const embed = new EmbedBuilder()
                            .setColor(COLORS.PRIMARY)
                            .setTitle('Supply Depot')
                            .setDescription(`**Available Resources:** ${updatedUser.tokens} Calamity Intel (CI)\n\nSelect an acquisition below.`);

                        await originalMsg.edit({ embeds: [embed], components: [row] });
                    }
                } catch (err) {
                    // Ignore if message deleted or fetch failed
                }
            }
        }

        // 4. Cancel Button
        else if (interaction.isButton() && interaction.customId === 'market:cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('Transaction Aborted')
                .setDescription('The acquisition was cancelled.');

            await interaction.update({ embeds: [cancelEmbed], components: [] });
        }
    }
};
