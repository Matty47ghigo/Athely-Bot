const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Percorso del file del database
const dbPath = path.resolve(__dirname, 'server.db');

// Verifica se la cartella esiste, altrimenti creala
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Cartella del database creata: ${dir}`);
}

// Inizializzazione del database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore durante l\'apertura del database:', err);
    } else {
        console.log('Database aperto correttamente.');
    }
});

// Funzione per inizializzare il database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            try {
                // Creazione della tabella warnings
                db.run(`
                    CREATE TABLE IF NOT EXISTS warnings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        userId TEXT NOT NULL,
                        guildId TEXT NOT NULL,
                        reason TEXT NOT NULL,
                        date DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Creazione della tabella ticket_settings
                db.run(`
                    CREATE TABLE IF NOT EXISTS ticket_settings (
                        guildId TEXT PRIMARY KEY,
                        categoryId TEXT,
                        logChannelId TEXT,
                        staffRoleId TEXT
                    )
                `);

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Esporta il database e la funzione di inizializzazione
module.exports = { db, initializeDatabase };