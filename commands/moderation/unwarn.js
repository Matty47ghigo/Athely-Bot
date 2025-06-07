const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db'); // Percorso corretto

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Rimuove un avvertimento da un utente.')
        .addUserOption(option => option.setName('user').setDescription('L\'utente da cui rimuovere l\'avvertimento').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo per rimuovere l\'avvertimento').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Nessun motivo fornito';

        // Verifica i permessi
        if (!interaction.member.permissions.has('KICK_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di rimuovere avvertimenti dagli utenti.', ephemeral: true });
        }

        // Invia una risposta immediata
        await interaction.deferReply();

        try {
            // Conta il numero di avvertimenti per l'utente nel server
            const countQuery = `
                SELECT COUNT(*) AS totalWarnings
                FROM warnings
                WHERE userId = ? AND guildId = ?
            `;
            db.get(countQuery, [user.id, interaction.guild.id], async (err, row) => {
                if (err) {
                    console.error('Errore durante il conteggio dei warn:', err);
                    return interaction.editReply({ content: 'Si è verificato un errore durante il conteggio dei warn.', ephemeral: true });
                }

                const totalWarnings = row.totalWarnings;

                if (totalWarnings === 0) {
                    return interaction.editReply({ content: 'Questo utente non ha avvertimenti.', ephemeral: true });
                }

                // Rimuovi l'ultimo avvertimento
                const deleteQuery = `
                    DELETE FROM warnings
                    WHERE id = (
                        SELECT id FROM warnings
                        WHERE userId = ? AND guildId = ?
                        ORDER BY date DESC
                        LIMIT 1
                    )
                `;
                db.run(deleteQuery, [user.id, interaction.guild.id], async function (err) {
                    if (err) {
                        console.error('Errore durante la rimozione del warn:', err);
                        return interaction.editReply({ content: 'Si è verificato un errore durante la rimozione del warn.', ephemeral: true });
                    }

                    // Conta il numero di avvertimenti rimasti
                    const remainingWarnings = totalWarnings - 1;

                    // Crea un embed per confermare la rimozione dell'avvertimento
                    const embed = new EmbedBuilder()
                        .setColor(0x00ff00) // Verde per Unwarn
                        .setTitle('Avvertimento Rimosso')
                        .addFields(
                            { name: 'Utente', value: user.tag, inline: true },
                            { name: 'Motivo', value: reason, inline: true },
                            { name: 'Numero di Avvertimenti Rimasti', value: `${remainingWarnings}`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                });
            });
        } catch (error) {
            console.error('Errore generale:', error);
            await interaction.editReply({ content: 'Si è verificato un errore durante l\'elaborazione del comando.', ephemeral: true });
        }
    },
};