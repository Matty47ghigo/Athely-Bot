const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, ActivityType, MessageFlags } = require('discord.js');
const { token } = require('./config.json');
const { db, initializeDatabase } = require('./database/db');
const { exec } = require('child_process')
require('./deploy-commands');

// Inizializza il client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();

// Caricamento dei comandi
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] Il comando in ${filePath} manca della proprietà "data" o "execute".`);
        }
    }
}

// Caricamento degli eventi
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args, db));
    }
}

// Listener per interazioni (comandi, bottoni, menu)
client.on('interactionCreate', async (interaction) => {
    // Ignora se non è un ChatInputCommand (slash command)
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Il comando ${interaction.commandName} non esiste.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Errore nell'esecuzione di /${interaction.commandName}`, error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    // Gestione bottoni
    else if (interaction.isButton()) {
        const { customId } = interaction;

        for (const [name, command] of client.commands.entries()) {
            if (customId === 'claim-ticket' && typeof command.claimTicket === 'function') {
                try {
                    await command.claimTicket(interaction);
                } catch (error) {
                    console.error(`Errore nel claimTicket:`, error);
                    handleInteractionError(interaction, error);
                }
                break;
            } else if (customId === 'close-ticket' && typeof command.closeTicket === 'function') {
                try {
                    await command.closeTicket(interaction);
                } catch (error) {
                    console.error(`Errore nel closeTicket:`, error);
                    handleInteractionError(interaction, error);
                }
                break;
            }
        }
    }

    // Gestione menu a selezione (se usi StringSelectMenuBuilder)
    else if (interaction.isStringSelectMenu()) {
        const { customId } = interaction;

        if (customId === 'select-ticket-type') {
            try {
                const ticketModule = require('./commands/tickets/ticket'); // Assicurati che il modulo ticket abbia la funzione handleTicketCreation
                if (typeof ticketModule.handleTicketCreation !== 'function') {
                    throw new Error('handleTicketCreation non è una funzione valida nel modulo ticket.');
                }
                await ticketModule.handleTicketCreation(interaction);
            } catch (error) {
                console.error(`Errore nella creazione del ticket tramite menu:`, error);
                handleInteractionError(interaction, error);
            }
        }
    }
});

// Funzione per gestire gli errori su interazioni già risposte
function handleInteractionError(interaction, error) {
    if (error.code === 40060) {
        console.warn("Interazione già terminata.");
        return;
    }

    if (interaction.deferred || interaction.replied) {
        interaction.followUp({ content: 'Si è verificato un errore.', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
        interaction.reply({ content: 'Si è verificato un errore.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
}

// Stato periodico del bot
client.on('ready', () => {
    console.log(`Bot loggato come ${client.user.tag}!`);

    function updateBotStatus() {
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        client.user.setActivity(`Tickets | ${totalUsers} utenti`, { type: ActivityType.Watching });
    }

    setInterval(updateBotStatus, 15 * 60 * 1000); // Ogni 15 minuti
    updateBotStatus();
});

// Riavvio automatico in caso di errori critici
process.on('uncaughtException', (error) => {
    console.error('Eccezione non catturata:', error);

    if (error.code === 60003) {
        console.log('Errore: Two factor is required for this operation. Riavviando il bot...');
        restartBot();
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('Rifiuto non gestito:', reason);

    if (reason?.code === 60003) {
        console.log('Errore: Two factor is required for this operation. Riavviando il bot...');
        restartBot();
    }
});

function restartBot() {
    console.log('Il bot sta riavviando...');
    exec('node .', (err, stdout, stderr) => {
        if (err) {
            console.error('Errore durante il riavvio:', err);
            return;
        }
        if (stderr) {
            console.error(stderr);
        }
        console.log(stdout);
    });
}

// Arresto pulito
process.on('SIGINT', () => {
    console.log('Arresto del bot...');
    client.destroy();
    process.exit(0);
});

// Avvia il bot
async function startBot() {
    try {
        await initializeDatabase();
        await client.login(token);
        console.log('Bot avviato correttamente.');
    } catch (error) {
        console.error('Impossibile avviare il bot:', error.message);
        process.exit(1);
    }
}

startBot();