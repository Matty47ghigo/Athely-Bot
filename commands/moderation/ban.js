const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banna un utente.')
        .addUserOption(option => option.setName('user').setDescription('L\'utente da bannare').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo del ban').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Nessun motivo fornito';

        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Non hai il permesso di bannare utenti.', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id);
        if (member) {
            await member.ban({ reason });

            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Rosso per Ban
                .setTitle('Utente Bannato')
                .addFields(
                    { name: 'Utente', value: user.tag, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply('Utente non trovato.');
        }
    },
};
