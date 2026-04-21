const express = require('express');
const pool = require('../db/database');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { q, startDate, endDate } = req.query;

  if (!q && !startDate && !endDate) {
    return res.status(400).json({ error: 'Veuillez renseigner un mot-clé ou une période.' });
  }

  try {
    let keywordParam = `%${(q || '').trim()}%`;
    const params = [keywordParam];
    let dateFilterTx = '';
    let dateFilterDoc = '';
    let dateFilterArc = '';

    if (startDate && endDate) {
      params.push(startDate, endDate);
      const startIdx = params.length - 1;
      const endIdx = params.length;
      dateFilterTx = ` AND date >= $${startIdx} AND date <= $${endIdx}`;
      // Documents has updated_at instead of date, and no true timeline except created_at/updated_at
      dateFilterDoc = ` AND updated_at >= $${startIdx} AND updated_at <= $${endIdx}`;
      dateFilterArc = ` AND date >= $${startIdx} AND date <= $${endIdx}`;
    }

    // UNION query
    const query = `
      -- 1. Transactions Live
      SELECT 
        'transaction' as source_type,
        id,
        date,
        type,
        description as libelle,
        montant,
        currency,
        project_id,
        NULL as justificatif_url,
        NULL as responsable
      FROM transactions
      WHERE (description ILIKE $1 OR type ILIKE $1) ${dateFilterTx}
      
      UNION ALL
      
      -- 2. Archived Operations
      SELECT 
        'archive' as source_type,
        id,
        date,
        type,
        libelle,
        montant,
        currency,
        projet_id as project_id,
        justificatif_url,
        responsable
      FROM archived_operations
      WHERE (libelle ILIKE $1 OR type ILIKE $1 OR projet_nom ILIKE $1 OR responsable ILIKE $1) ${dateFilterArc}
      
      UNION ALL
      
      -- 3. Documents
      SELECT 
        'document' as source_type,
        id,
        DATE(updated_at) as date,
        type,
        name as libelle,
        0 as montant,
        NULL as currency,
        NULL as project_id,
        url as justificatif_url,
        NULL as responsable
      FROM documents
      WHERE (name ILIKE $1 OR type ILIKE $1 OR value ILIKE $1) ${dateFilterDoc}
      
      ORDER BY date DESC
      LIMIT 500;
    `;

    const { rows } = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche.' });
  }
});

module.exports = router;
