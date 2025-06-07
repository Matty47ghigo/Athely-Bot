const { SlashCommandBuilder } = require('discord.js');

const closeCommand = new SlashCommandBuilder()
    .setName('close')
    .setDescription('Chiude il ticket corrente.')
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('Specifica la ragione per la chiusura del ticket.')
            .setRequired(false));

module.exports = {
    data: closeCommand,
    async execute(interaction) {
        const channel = interaction.channel;
        const member = interaction.member;
        const reason = interaction.options.getString('reason') || 'Nessuna ragione specificata';

        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'Questo non è un canale di ticket.', ephemeral: true });
        }

        if (!(channel.name.includes(member.id) || member.permissions.has('ManageChannels'))) {
            return interaction.reply({ content: 'Non hai il permesso di chiudere questo ticket.', ephemeral: true });
        }

        await interaction.reply({ content: `Il ticket verrà chiuso tra 5 secondi...\n**Ragione:** ${reason}`, ephemeral: true });

        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                console.error(error);
                interaction.followUp({ content: 'Si è verificato un errore durante la chiusura del ticket.', ephemeral: true });
            }
        }, 5000);
    },
};