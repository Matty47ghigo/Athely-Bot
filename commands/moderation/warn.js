const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db'); // Percorso corretto

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avverte un utente.')
        .addUserOption(option => option.setName('user').setDescription('L\'utente da avvertire').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo dell\'avvertimento').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Verifica i permessi
        if (!interaction.member.permissions.has('KICK_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di avvertire utenti.', ephemeral: true });
        }

        // Invia una risposta immediata
        await interaction.deferReply();

        try {
            // Inserisci il warn nel database
            const query = `
                INSERT INTO warnings (userId, guildId, reason)
                VALUES (?, ?, ?)
            `;
            db.run(query, [user.id, interaction.guild.id, reason], async function (err) {
                if (err) {
                    console.error('Errore durante l\'inserimento del warn:', err);
                    return interaction.editReply({ content: 'Si è verificato un errore durante il salvataggio del warn.', ephemeral: true });
                }

                // Conta il numero totale di warn per l'utente nel server
                const countQuery = `
                    SELECT COUNT(*) AS totalWarnings
                    FROM warnings
                    WHERE userId = ? AND guildId = ?
                `;
                db.get(countQuery, [user.id, interaction.guild.id], (err, row) => {
                    if (err) {
                        console.error('Errore durante il conteggio dei warn:', err);
                        return interaction.editReply({ content: 'Si è verificato un errore durante il conteggio dei warn.', ephemeral: true });
                    }

                    const totalWarnings = row.totalWarnings;

                    // Crea un embed per confermare l'avvertimento
                    const embed = new EmbedBuilder()
                        .setColor(0xffa500) // Arancione per Warn
                        .setTitle('Utente Avvertito')
                        .addFields(
                            { name: 'Utente', value: user.tag, inline: true },
                            { name: 'Motivo', value: reason, inline: true },
                            { name: 'Numero di Avvertimenti', value: `${totalWarnings}`, inline: true }
                        )
                        .setTimestamp();

                    interaction.editReply({ embeds: [embed] });
                });
            });
        } catch (error) {
            console.error('Errore generale:', error);
            await interaction.editReply({ content: 'Si è verificato un errore durante l\'elaborazione del comando.', ephemeral: true });
        }
    },
};