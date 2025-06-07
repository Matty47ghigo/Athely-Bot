const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config.json'); // <-- Percorso corretto?
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`Comando ${command.data.name} aggiunto per il deploy`);
        } else {
            console.log(`[WARNING] Il comando in ${filePath} manca della proprietà "data" o "execute".`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Inizio l\'aggiornamento dei comandi dell\'applicazione (/).');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Comandi dell\'applicazione (/) aggiornati con successo.');
    } catch (error) {
        console.error(error);
    }
})();
