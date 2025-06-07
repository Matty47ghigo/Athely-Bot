const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Configura il sistema di ticket per il server.')
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Categoria in cui verranno creati i ticket')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('log-channel')
                .setDescription('Canale di log per i ticket')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('staff-role')
                .setDescription('Ruolo dello staff da pingare nei ticket')
                .setRequired(true)),
    async execute(interaction) {
        // Verifica i permessi
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'Non hai il permesso di configurare il sistema di ticket.', ephemeral: true });
        }

        // Invia una risposta immediata per evitare timeout
        await interaction.deferReply();

        try {
            // Recupera i valori dagli input
            const category = interaction.options.getChannel('category');
            const logChannel = interaction.options.getChannel('log-channel');
            const staffRole = interaction.options.getRole('staff-role');

            // Verifica se il comando è già stato eseguito per questo server
            const checkQuery = `
                SELECT * FROM ticket_settings WHERE guildId = ?
            `;
            db.get(checkQuery, [interaction.guild.id], async (err, row) => {
                if (err) {
                    console.error('Errore durante la verifica delle impostazioni:', err);
                    return interaction.editReply({ content: 'Si è verificato un errore durante la verifica delle impostazioni.', ephemeral: true });
                }

                if (row) {
                    return interaction.editReply({ content: 'Il sistema di ticket è già stato configurato per questo server.', ephemeral: true });
                }

                // Salva le impostazioni nel database
                const insertQuery = `
                    INSERT INTO ticket_settings (guildId, categoryId, logChannelId, staffRoleId)
                    VALUES (?, ?, ?, ?)
                `;
                db.run(insertQuery, [interaction.guild.id, category.id, logChannel.id, staffRole.id], async function (err) {
                    if (err) {
                        console.error('Errore durante il salvataggio delle impostazioni:', err);
                        return interaction.editReply({ content: 'Si è verificato un errore durante il salvataggio delle impostazioni.', ephemeral: true });
                    }

                    // Conferma la configurazione
                    await interaction.editReply({
                        content: `Sistema di ticket configurato con successo!\n- Categoria: ${category.name}\n- Canale di log: ${logChannel.name}\n- Ruolo dello staff: ${staffRole.name}`,
                        ephemeral: true
                    });
                });
            });
        } catch (error) {
            console.error('Errore generale:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
            }
        }
    },
};