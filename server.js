const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize SQLite database
const db = new sqlite3.Database('./messages.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        
        // Create messages table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// API Routes

// Submit form data to database
app.post('/api/submit', (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const sql = 'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)';
    
    db.run(sql, [name, email, message], function(err) {
        if (err) {
            console.error('Error inserting data:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({
            success: true,
            id: this.lastID,
            message: 'Message saved successfully'
        });
    });
});

// Get all messages from database
app.get('/api/messages', (req, res) => {
    const sql = 'SELECT * FROM messages ORDER BY created_at DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(rows);
    });
});

// Serve a simple HTML page to view saved data
app.get('/data', (req, res) => {
    const sql = 'SELECT * FROM messages ORDER BY created_at DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err.message);
            return res.status(500).send('Database error');
        }
        
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Saved Messages</title>
            <style>
                body { 
                    font-family: 'Roboto', sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f4f4f4; 
                }
                .container { 
                    max-width: 1000px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 20px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
                }
                h1 { 
                    color: #FF1493; 
                    text-align: center; 
                    margin-bottom: 30px; 
                }
                .message-card { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    margin: 15px 0; 
                    border-radius: 8px; 
                    border-left: 5px solid #FF1493; 
                }
                .message-meta { 
                    color: #666; 
                    font-size: 0.9em; 
                    margin-bottom: 10px; 
                }
                .message-content { 
                    background: white; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin-top: 10px; 
                }
                .no-messages { 
                    text-align: center; 
                    color: #666; 
                    font-style: italic; 
                    margin: 50px 0; 
                }
                .back-link { 
                    display: inline-block; 
                    margin-bottom: 20px; 
                    color: #FF1493; 
                    text-decoration: none; 
                    font-weight: 500; 
                }
                .back-link:hover { 
                    color: #C71585; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-link">← Back to Portfolio</a>
                <h1>Saved Messages (${rows.length})</h1>
        `;
        
        if (rows.length === 0) {
            html += '<div class="no-messages">No messages saved yet.</div>';
        } else {
            rows.forEach(row => {
                const date = new Date(row.created_at).toLocaleString();
                html += `
                    <div class="message-card">
                        <div class="message-meta">
                            <strong>ID:</strong> ${row.id} | 
                            <strong>Name:</strong> ${row.name} | 
                            <strong>Email:</strong> ${row.email} | 
                            <strong>Date:</strong> ${date}
                        </div>
                        <div class="message-content">
                            ${row.message}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`View your portfolio at: http://localhost:${PORT}`);
    console.log(`View saved messages at: http://localhost:${PORT}/data`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
