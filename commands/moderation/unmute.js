const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Rimuove il timeout da un utente.')
        .addUserOption(option => option.setName('user').setDescription('L\'utente da rimuovere il timeout').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo per rimuovere il timeout').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Nessun motivo fornito';
        const member = await interaction.guild.members.fetch(user.id);

        if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di rimuovere il timeout dagli utenti.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'Utente non trovato.', ephemeral: true });
        }

        try {
            await member.timeout(null, reason);

            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // Verde per Unmute
                .setTitle('Timeout Rimosso')
                .addFields(
                    { name: 'Utente', value: user.tag, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Errore durante la rimozione del timeout dall\'utente.', ephemeral: true });
        }
    },
};
