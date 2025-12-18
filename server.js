import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - Request: ${req.method} ${req.url}`);
  next();
});

// Explicitly serve index.html at root
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`ERROR: index.html not found at ${indexPath}`);
    res.status(404).send('FATAL ERROR: index.html not found. Check container volumes.');
  }
});

// Serve static files (like index.tsx, App.tsx, css)
// We serve the root directory so browser can load .tsx files via Babel
app.use(express.static(__dirname));

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to PostgreSQL successfully.');
  }
});

// --- Routes ---

// AI Parse Route
app.post('/api/ai/parse', async (req, res) => {
  const { prompt, referenceDate } = req.body;
  
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  try {
    const todayStr = new Date(referenceDate).toISOString().split('T')[0];
    const aiPrompt = `
      User Input: "${prompt}"
      Reference Date (Today): ${todayStr}

      Extract the event details into JSON. 
      - If the year is missing, assume current year.
      - If date is missing, assume today.
      - date must be YYYY-MM-DD.
      - time must be HH:mm (24 hour). If no time specified, use "09:00".
      - description should be a short summary or empty string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "date", "time"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to parse event" });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ id: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Events
app.get('/api/events', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const result = await pool.query(
      'SELECT id, user_id as "userId", title, description, event_date as date, event_time as time, color FROM events WHERE user_id = $1',
      [userId]
    );
    
    const formattedEvents = result.rows.map(e => ({
      ...e,
      date: new Date(e.date).toISOString().split('T')[0]
    }));

    res.json(formattedEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save Event
app.post('/api/events', async (req, res) => {
  const { id, userId, title, description, date, time, color } = req.body;
  
  try {
    const check = await pool.query('SELECT id FROM events WHERE id = $1', [id]);
    
    if (check.rows.length > 0) {
      await pool.query(
        'UPDATE events SET title=$1, description=$2, event_date=$3, event_time=$4, color=$5 WHERE id=$6',
        [title, description, date, time, color, id]
      );
    } else {
      await pool.query(
        'INSERT INTO events (id, user_id, title, description, event_date, event_time, color) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, userId, title, description, date, time, color]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Event
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all for SPA (must be last)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
  console.log(`Working directory: ${__dirname}`);
});