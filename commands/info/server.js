const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();

        // Creazione dell'embed
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`Informazioni sul server ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Nome Server', value: guild.name, inline: true },
                { name: 'ID Server', value: guild.id, inline: true },
                { name: 'Creato il', value: guild.createdAt.toDateString(), inline: true },
                { name: 'Creatore', value: owner.user.tag, inline: true },
                { name: 'Numero Membri', value: guild.memberCount.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Informazioni server', iconURL: guild.iconURL({ dynamic: true }) });

        await interaction.reply({ embeds: [embed] });
    },
};
