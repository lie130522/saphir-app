const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Get settings
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
    // Convert array of {key, value} to object
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update settings (Admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Format de données invalide' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Postgres ON CONFLICT requires a constraint, PRIMARY KEY is implicitly supported
    const query = 'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at';

    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string') {
        await client.query(query, [key, value]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

module.exports = router;
