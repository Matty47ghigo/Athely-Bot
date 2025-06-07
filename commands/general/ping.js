const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Risponde con Pong! e mostra il ping del bot.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Calcolando il ping...', fetchReply: true });
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! 🏓 Il ping è di ${ping} ms. Il ping WebSocket è di ${interaction.client.ws.ping} ms.`);
    },
};
