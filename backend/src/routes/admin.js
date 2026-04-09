const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');
const router = express.Router();

router.post('/reset', authenticate, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Delete all transactions
    await client.query('DELETE FROM transactions');
    
    // 2. Delete all documents (including the actual files on disk ? Optionally, but at least DB entries)
    await client.query('DELETE FROM documents');
    
    // 3. Delete all reports
    await client.query('DELETE FROM reports');
    
    // Reset sequence counts for postgres
    await client.query('ALTER SEQUENCE transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE documents_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE reports_id_seq RESTART WITH 1');
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Base de données réinitialisée pour le mode production.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du reset', err);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation de la base de données' });
  } finally {
    client.release();
  }
});

module.exports = router;
