const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

const BASE_QUERY = `
  SELECT t.*,
    a.nom as account_nom, a.devise as account_devise, a.type as account_type,
    c.nom as category_nom, c.nature as category_nature,
    p.nom as project_nom,
    e.nom as employee_nom, e.prenom as employee_prenom,
    u.nom as user_nom
  FROM transactions t
  LEFT JOIN accounts a ON t.account_id = a.id
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN projects p ON t.project_id = p.id
  LEFT JOIN employees e ON t.employee_id = e.id
  LEFT JOIN users u ON t.user_id = u.id
`;

router.get('/', authenticate, async (req, res) => {
  const { date_debut, date_fin, type, account_id, category_id, project_id, employee_id, nature, devise, is_remboursable } = req.query;
  let where = [];
  let params = [];
  let pIndex = 1;

  if (date_debut) { where.push(`t.date >= $${pIndex++}`); params.push(date_debut); }
  if (date_fin) { where.push(`t.date <= $${pIndex++}`); params.push(date_fin); }
  if (type) { where.push(`t.type = $${pIndex++}`); params.push(type); }
  if (account_id) { where.push(`t.account_id = $${pIndex++}`); params.push(account_id); }
  if (category_id) { where.push(`t.category_id = $${pIndex++}`); params.push(category_id); }
  if (project_id) { where.push(`t.project_id = $${pIndex++}`); params.push(project_id); }
  if (employee_id) { where.push(`t.employee_id = $${pIndex++}`); params.push(employee_id); }
  if (nature) { where.push(`t.nature = $${pIndex++}`); params.push(nature); }
  if (devise) { where.push(`t.devise = $${pIndex++}`); params.push(devise); }
  if (is_remboursable !== undefined) { where.push(`t.is_remboursable = $${pIndex++}`); params.push(is_remboursable === 'true' ? 1 : 0); }

  const sql = BASE_QUERY + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY t.date DESC, t.id DESC';
  
  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/categories', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY type, nature, nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { date, type, montant, devise, account_id, category_id, nature, project_id, employee_id, description, reference, is_remboursable } = req.body;
  if (!date || !type || !montant || !account_id || !nature) return res.status(400).json({ error: 'Champs requis manquants' });
  if (montant <= 0) return res.status(400).json({ error: 'Le montant doit être positif' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (date, type, montant, devise, account_id, category_id, nature, project_id, employee_id, user_id, description, reference, is_remboursable) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [date, type, montant, devise || 'USD', account_id, category_id || null, nature, project_id || null, employee_id || null, req.user.id, description || null, reference || null, is_remboursable ? 1 : 0]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { date, type, montant, devise, account_id, category_id, nature, project_id, employee_id, description, reference, is_remboursable } = req.body;
  try {
    await pool.query(
      `UPDATE transactions SET date=$1, type=$2, montant=$3, devise=$4, account_id=$5, category_id=$6, nature=$7, project_id=$8, employee_id=$9, description=$10, reference=$11, is_remboursable=$12 WHERE id=$13`,
      [date, type, montant, devise || 'USD', account_id, category_id || null, nature, project_id || null, employee_id || null, description || null, reference || null, is_remboursable ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const transactionId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM documents WHERE transaction_id=$1', [transactionId]);
    await client.query('DELETE FROM transactions WHERE id=$1', [transactionId]);
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
