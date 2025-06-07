const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Gestione dei comandi slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`Nessun comando trovato per ${interaction.commandName}.`);
                return;
            }

            try {
                // Esegui il comando
                await command.execute(interaction);
            } catch (error) {
                console.error(`Errore durante l'esecuzione del comando ${interaction.commandName}:`, error);

                // Rispondi all'utente in caso di errore
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
                }
            }
        }

        // Gestione dei menu a discesa
        if (interaction.isStringSelectMenu()) {
            for (const [commandName, command] of interaction.client.commands.entries()) {
                if ('handleTicketCreation' in command && interaction.customId === 'create-ticket-menu') {
                    try {
                        await command.handleTicketCreation(interaction);
                    } catch (error) {
                        console.error(`Errore durante la gestione del menu a discesa ${interaction.customId}:`, error);
                        await interaction.reply({ content: 'Si è verificato un errore durante l\'esecuzione dell\'azione.', ephemeral: true });
                    }
                }
            }
        }

        // Gestione dei bottoni
        if (interaction.isButton()) {
            if (interaction.customId === 'create-ticket-menu') {
                const command = interaction.client.commands.get('ticket'); // Assumiamo che il comando ticket gestisca il pulsante
                if (command && command.handleTicketCreation) {
                    try {
                        await command.handleTicketCreation(interaction); // Esegue la funzione per creare il ticket
                    } catch (error) {
                        console.error(`Errore durante la gestione del pulsante ${interaction.customId}:`, error);
                        await interaction.reply({ content: 'Si è verificato un errore durante la creazione del ticket.', ephemeral: true });
                    }
                }
            }

            if (interaction.customId === 'claim-ticket') {
                const command = interaction.client.commands.get('ticket'); // Assumiamo che il comando ticket gestisca il pulsante
                if (command && command.claimTicket) {
                    try {
                        await command.claimTicket(interaction); // Esegue la funzione per reclamare il ticket
                    } catch (error) {
                        console.error(`Errore durante la gestione del pulsante ${interaction.customId}:`, error);
                        await interaction.reply({ content: 'Si è verificato un errore durante il claim del ticket.', ephemeral: true });
                    }
                }
            }

            if (interaction.customId === 'close-ticket') {
                const command = interaction.client.commands.get('ticket'); // Assumiamo che il comando ticket gestisca il pulsante
                if (command && command.closeTicket) {
                    try {
                        await command.closeTicket(interaction); // Esegue la funzione per chiudere il ticket
                    } catch (error) {
                        console.error(`Errore durante la gestione del pulsante ${interaction.customId}:`, error);
                        await interaction.reply({ content: 'Si è verificato un errore durante la chiusura del ticket.', ephemeral: true });
                    }
                } else {
                    console.error('La funzione closeTicket non è stata trovata nel comando ticket.');
                    await interaction.reply({ content: 'Si è verificato un errore durante la gestione del pulsante.', ephemeral: true });
                }
            }
        }

        // Gestione dei modali
        if (interaction.isModalSubmit()) {
            for (const [commandName, command] of interaction.client.commands.entries()) {
                if ('handleTicketFormSubmit' in command) {
                    try {
                        await command.handleTicketFormSubmit(interaction);
                    } catch (error) {
                        console.error(`Errore durante la gestione del modulo ${interaction.customId}:`, error);
                        await interaction.reply({ content: 'Si è verificato un errore durante l\'esecuzione dell\'azione.', ephemeral: true });
                    }
                }
            }
        }
    },
};