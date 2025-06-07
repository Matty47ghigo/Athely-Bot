const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const { db } = require('../../database/db');
const { createTranscript } = require('discord-html-transcripts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Crea un messaggio per aprire un ticket.'),
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: 'Non hai il permesso di eseguire questo comando.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const checkQuery = `SELECT * FROM ticket_settings WHERE guildId = ?`;

        db.get(checkQuery, [interaction.guild.id], async (err, row) => {
            if (err) {
                console.error('Errore durante la verifica delle impostazioni:', err);
                return interaction.editReply({
                    content: 'Si è verificato un errore durante il recupero delle impostazioni.',
                    ephemeral: true,
                });
            }
            if (!row) {
                return interaction.editReply({
                    content: 'Il sistema di ticket non è stato configurato. Usa `/ticket-setup` per configurarlo.',
                    ephemeral: true,
                });
            }

            // Messaggio embed principale
            const embed = new EmbedBuilder()
                .setColor(0x800080)
                .setTitle('Supporto')
                .setDescription(
                    '**Che cosa sono i ticket?**\n' +
                        'I ticket equivalgono a un sistema di supporto che permette di parlare direttamente con lo staff.\n\n' +
                        '**Come aprire un ticket?**\n' +
                        '- Seleziona il tipo di ticket dal menu qui sotto.'
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Powered by Matty47ghigo', iconURL: interaction.guild.iconURL({ dynamic: true }) });

            // Menu a selezione
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select-ticket-type')
                .setPlaceholder('Seleziona il tipo di ticket')
                .addOptions([
                    {
                        label: 'Supporto',
                        value: 'supporto',
                        description: 'Richiedi aiuto generico',
                        emoji: '🎫',
                    },
                    {
                        label: 'UnBan',
                        value: 'unban',
                        description: 'Richiesta rimozione ban/mute',
                        emoji: '🔓',
                    },
                    {
                        label: 'Report',
                        value: 'report',
                        description: 'Segnala un utente',
                        emoji: '🚨',
                    },
                    {
                        label: 'VIP',
                        value: 'vip',
                        description: 'Richieste VIP',
                        emoji: '⭐',
                    },
                    {
                        label: 'Bug',
                        value: 'bug',
                        description: 'Segnala un bug',
                        emoji: '🐞',
                    },
                ]);

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.channel.send({ embeds: [embed], components: [actionRow] });
            await interaction.editReply({
                content: 'Messaggio del ticket creato con successo!',
                ephemeral: true,
            });
        });
    },
    async handleTicketCreation(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const checkQuery = `SELECT * FROM ticket_settings WHERE guildId = ?`;
            db.get(checkQuery, [interaction.guild.id], async (err, row) => {
                if (err) {
                    console.error('Errore durante la verifica delle impostazioni:', err);
                    return interaction.editReply({
                        content: 'Si è verificato un errore durante il recupero delle impostazioni.',
                        ephemeral: true,
                    });
                }
                if (!row) {
                    return interaction.editReply({
                        content: 'Il sistema di ticket non è stato configurato. Usa `/ticket-setup` per configurarlo.',
                        ephemeral: true,
                    });
                }

                const categoryId = row.categoryId;
                const staffRoleId = row.staffRoleId;

                // Verifica se l'utente ha già un ticket aperto
                const existingChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === `ticket-${interaction.user.username}`
                );
                if (existingChannel) {
                    return interaction.editReply({
                        content: 'Hai già un ticket aperto. Non puoi crearne un altro.',
                        ephemeral: true,
                    });
                }

                // Crea il canale ticket
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: 0,
                    parent: categoryId,
                    topic: `Creato da ${interaction.user.id}`,
                    permissionOverwrites: [
                        { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
                        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                        { id: staffRoleId, allow: ['ViewChannel', 'SendMessages'] },
                    ],
                });

                // Nuovo messaggio di benvenuto personalizzato
                const welcomeMessage = new EmbedBuilder()
                    .setColor(0x800080)
                    .setTitle('🎟️ | ATHELY TICKETS')
                    .setDescription(
                        `${interaction.user}, grazie per aver aperto un ticket! 📨\n\n` +
                            '*Per favore, attendi che uno staffer ti risponda.*\n\n' +
                            '> **⏳ Il tempo massimo di risposta è di 24 ore.**\n' +
                            '> Ti preghiamo di **non menzionare** alcun membro dello staff durante l\'attesa.'
                    )
                    .setFooter({ text: 'Powered by Matty47ghigo', iconURL: interaction.guild.iconURL({ dynamic: true }) });

                // Pulsanti Claim e Chiudi
                const claimButton = new ButtonBuilder()
                    .setCustomId('claim-ticket')
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Success);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close-ticket')
                    .setLabel('Chiudi Ticket')
                    .setStyle(ButtonStyle.Danger);

                const actionRow = new ActionRowBuilder().addComponents([claimButton, closeButton]);

                // Invia il messaggio nel nuovo canale
                await ticketChannel.send({ embeds: [welcomeMessage], components: [actionRow] });
                await interaction.editReply({
                    content: `Il tuo ticket è stato creato: ${ticketChannel}`,
                    ephemeral: true,
                });
            });
        } catch (error) {
            console.error('Errore durante la creazione del ticket:', error);
            await interaction.editReply({
                content: 'Si è verificato un errore durante la creazione del ticket.',
                ephemeral: true,
            });
        }
    },
    async claimTicket(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            const checkQuery = `SELECT * FROM ticket_settings WHERE guildId = ?`;
            db.get(checkQuery, [interaction.guild.id], async (err, row) => {
                if (err) {
                    console.error('Errore durante la verifica delle impostazioni:', err);
                    return interaction.followUp({
                        content: 'Si è verificato un errore durante il recupero delle impostazioni.',
                        ephemeral: true,
                    });
                }
                if (!row) {
                    return interaction.followUp({
                        content: 'Il sistema di ticket non è stato configurato. Usa `/ticket-setup` per configurarlo.',
                        ephemeral: true,
                    });
                }

                const staffRoleId = row.staffRoleId;

                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.followUp({
                        content: 'Non hai il permesso di reclamare questo ticket.',
                        ephemeral: true,
                    });
                }

                // Disabilita il pulsante Claim
                const disabledClaimButton = new ButtonBuilder()
                    .setCustomId('claim-ticket')
                    .setLabel('Ticket Claimed')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close-ticket')
                    .setLabel('Chiudi Ticket')
                    .setStyle(ButtonStyle.Danger);

                const actionRow = new ActionRowBuilder().addComponents([disabledClaimButton, closeButton]);
                await interaction.message.edit({ components: [actionRow] });

                // Modifica i permessi del canale
                await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                await interaction.channel.permissionOverwrites.edit(staffRoleId, { SendMessages: false });
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { SendMessages: true });

                // Notifica che il ticket è stato reclamato
                const claimEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Ticket Reclamato')
                    .setDescription(`${interaction.user} ha reclamato questo ticket.`)
                    .setFooter({ text: 'Powered by Matty47ghigo', iconURL: interaction.guild.iconURL({ dynamic: true }) });

                await interaction.channel.send({ embeds: [claimEmbed] });
                await interaction.followUp({
                    content: 'Hai reclamato con successo questo ticket.',
                    ephemeral: true,
                });
            });
        } catch (error) {
            console.error('Errore durante il claim del ticket:', error);
            await interaction.followUp({
                content: 'Si è verificato un errore durante il claim del ticket.',
                ephemeral: true,
            });
        }
    },
    async closeTicket(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            const checkQuery = `SELECT * FROM ticket_settings WHERE guildId = ?`;
            db.get(checkQuery, [interaction.guild.id], async (err, row) => {
                if (err) {
                    console.error('Errore durante la verifica delle impostazioni:', err);
                    return interaction.followUp({
                        content: 'Si è verificato un errore durante il recupero delle impostazioni.',
                        ephemeral: true,
                    });
                }
                if (!row) {
                    return interaction.followUp({
                        content: 'Il sistema di ticket non è stato configurato. Usa `/ticket-setup` per configurarlo.',
                        ephemeral: true,
                    });
                }

                const logChannelId = row.logChannelId;

                const ticketTopic = interaction.channel.topic;
                if (!ticketTopic || !ticketTopic.startsWith('Creato da ')) {
                    return interaction.followUp({
                        content: 'Impossibile determinare il creatore del ticket.',
                        ephemeral: true,
                    });
                }

                const ticketCreatorId = ticketTopic.replace('Creato da ', '');
                const ticketCreator = await interaction.guild.members.fetch(ticketCreatorId).catch(() => null);

                if (!ticketCreator) {
                    return interaction.followUp({
                        content: 'Impossibile trovare il creatore del ticket.',
                        ephemeral: true,
                    });
                }

                // Genera trascrizione HTML
                const attachment = await createTranscript(interaction.channel, {
                    limit: -1,
                    returnType: 'attachment',
                    filename: `${interaction.channel.name}-transcript.html`,
                });

                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (!logChannel) {
                    return interaction.followUp({
                        content: 'Il canale di log non è stato configurato correttamente.',
                        ephemeral: true,
                    });
                }

                // Embed per il canale log
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(`Trascrizione di ${interaction.channel.name}`)
                    .setDescription(
                        `**ID del Ticket:** ${interaction.channel.id}\n` +
                            `**Creatore:** ${ticketCreator.toString()}\n` +
                            `**Staffer:** ${interaction.user.toString()}\n` +
                            'Il ticket è stato chiuso.'
                    )
                    .setFooter({ text: 'Powered by Matty47ghigo', iconURL: interaction.guild.iconURL({ dynamic: true }) });

                await logChannel.send({ embeds: [logEmbed], files: [attachment] });

                // DM all'utente
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Ticket Chiuso')
                    .setDescription(
                        `**ID del Ticket:** ${interaction.channel.id}\n` +
                            `**Creatore:** ${ticketCreator.toString()}\n` +
                            `**Staffer:** ${interaction.user.toString()}\n\n` +
                            'Il ticket è stato chiuso per motivi di privacy. Se necessario, puoi richiedere informazioni ad uno staffer.'
                    )
                    .setFooter({ text: 'Powered by Matty47ghigo', iconURL: interaction.guild.iconURL({ dynamic: true }) });

                try {
                    await ticketCreator.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.warn("Non è stato possibile inviare un DM all'utente:", error.message);
                }

                // Elimina il canale
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Errore durante l\'eliminazione del canale:', error.message);
                    return interaction.followUp({
                        content: 'Impossibile eliminare il canale del ticket.',
                        ephemeral: true,
                    });
                }

                await interaction.followUp({
                    content: 'Il ticket è stato chiuso con successo.',
                    ephemeral: true,
                });
            });
        } catch (error) {
            console.error('Errore durante la chiusura del ticket:', error);
            await interaction.followUp({
                content: 'Si è verificato un errore durante la chiusura del ticket.',
                ephemeral: true,
            });
        }
    },
};