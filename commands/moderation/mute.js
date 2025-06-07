const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mette in timeout un utente.')
        .addUserOption(option => option.setName('user').setDescription('L\'utente da mettere in timeout').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Durata del timeout (es. 10m, 1h)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo del timeout').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Nessun motivo fornito';
        const member = await interaction.guild.members.fetch(user.id);

        if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di mettere in timeout gli utenti.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'Utente non trovato.', ephemeral: true });
        }

        const durationMs = ms(duration);
        if (!durationMs) {
            return interaction.reply({ content: 'Durata non valida.', ephemeral: true });
        }

        try {
            await member.timeout(durationMs, reason);

            const embed = new EmbedBuilder()
                .setColor(0xffff00) // Giallo per Timeout
                .setTitle('Utente in Timeout')
                .addFields(
                    { name: 'Utente', value: user.tag, inline: true },
                    { name: 'Durata', value: duration, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Errore durante il timeout dell\'utente.', ephemeral: true });
        }
    },
};
