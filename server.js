const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to PostgreSQL successfully.');
  }
});

// --- Routes ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // In a real app, hash the password here using bcrypt
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
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
    
    // In real app, compare hash with bcrypt.compare
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
    
    // Format date objects to YYYY-MM-DD strings if postgres returns Date objects
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

// Save Event (Create or Update)
app.post('/api/events', async (req, res) => {
  const { id, userId, title, description, date, time, color } = req.body;
  
  try {
    // Check if exists
    const check = await pool.query('SELECT id FROM events WHERE id = $1', [id]);
    
    if (check.rows.length > 0) {
      // Update
      await pool.query(
        'UPDATE events SET title=$1, description=$2, event_date=$3, event_time=$4, color=$5 WHERE id=$6',
        [title, description, date, time, color, id]
      );
    } else {
      // Insert
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

app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
