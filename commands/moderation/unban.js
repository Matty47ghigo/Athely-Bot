const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Rimuove il ban da un utente.')
        .addStringOption(option => option.setName('userid').setDescription('L\'ID dell\'utente da sbannare').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo per sbannare l\'utente').setRequired(false)),
    async execute(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'Nessun motivo fornito';

        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di sbannare utenti.', ephemeral: true });
        }

        try {
            await interaction.guild.members.unban(userId, reason);

            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // Verde per Unban
                .setTitle('Utente Sbannato')
                .addFields(
                    { name: 'ID Utente', value: userId, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Errore durante lo sbannamento dell\'utente. Assicurati che l\'ID sia corretto e che l\'utente sia bannato.', ephemeral: true });
        }
    },
};
