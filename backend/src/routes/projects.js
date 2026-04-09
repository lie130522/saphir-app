const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY statut, nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { nom, client, budget_usd, budget_cdf, statut, date_debut, date_fin, description, type_gestion } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom du projet requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO projects (nom, client, budget_usd, budget_cdf, statut, date_debut, date_fin, description, type_gestion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [nom, client || null, budget_usd || 0, budget_cdf || 0, statut || 'actif', date_debut || null, date_fin || null, description || null, type_gestion || 'plein_pouvoir']
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { nom, client, budget_usd, budget_cdf, statut, date_debut, date_fin, description, type_gestion } = req.body;
  try {
    await pool.query(
      'UPDATE projects SET nom=$1, client=$2, budget_usd=$3, budget_cdf=$4, statut=$5, date_debut=$6, date_fin=$7, description=$8, type_gestion=$9 WHERE id=$10',
      [nom, client || null, budget_usd || 0, budget_cdf || 0, statut || 'actif', date_debut || null, date_fin || null, description || null, type_gestion || 'plein_pouvoir', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as c FROM transactions WHERE project_id=$1', [req.params.id]);
    if (parseInt(rows[0].c) > 0) return res.status(400).json({ error: 'Ce projet a des transactions associées, impossible de le supprimer' });
    await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
