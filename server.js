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

app.use(cors());
app.use(bodyParser.json());

// Explicitly handle TSX mime type for browser ES modules
express.static.mime.define({'text/javascript': ['tsx']});

app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Routes ---

app.post('/api/ai/parse', async (req, res) => {
  const { prompt, referenceDate } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  try {
    const todayStr = new Date(referenceDate).toISOString().split('T')[0];
    const aiPrompt = `User Input: "${prompt}". Today: ${todayStr}. Extract JSON: {title, date(YYYY-MM-DD), time(HH:mm), description}. Default time 09:00 if missing.`;

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

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [username, password]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err);
    res.status(err.code === '23505' ? 409 : 500).json({ error: 'Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE username = $1 AND password_hash = $2', [username, password]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Error' });
  }
});

app.get('/api/events', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query('SELECT id, user_id, title, description, event_date as date, event_time as time, color FROM events WHERE user_id = $1', [userId]);
    res.json(result.rows.map(e => ({ ...e, date: new Date(e.date).toISOString().split('T')[0] })));
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: 'Error' });
  }
});

app.post('/api/events', async (req, res) => {
  const { id, userId, title, description, date, time, color } = req.body;
  try {
    const check = await pool.query('SELECT id FROM events WHERE id = $1', [id]);
    if (check.rows.length > 0) {
      await pool.query('UPDATE events SET title=$1, description=$2, event_date=$3, event_time=$4, color=$5 WHERE id=$6', [title, description, date, time, color, id]);
    } else {
      await pool.query('INSERT INTO events (id, user_id, title, description, event_date, event_time, color) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, userId, title, description, date, time, color]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Save event error:", err);
    res.status(500).json({ error: 'Error' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: 'Error' });
  }
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('index.html not found');
});

app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});