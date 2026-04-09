const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees WHERE actif=1 ORDER BY nom, prenom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { nom, prenom, poste, telephone, email, date_embauche } = req.body;
  if (!nom || !prenom || !poste) return res.status(400).json({ error: 'Nom, prénom et poste requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO employees (nom, prenom, poste, telephone, email, date_embauche) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [nom, prenom, poste, telephone || null, email || null, date_embauche || null]
    );
    res.status(201).json({ id: rows[0].id, nom, prenom, poste });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { nom, prenom, poste, telephone, email, date_embauche } = req.body;
  try {
    await pool.query(
      'UPDATE employees SET nom=$1, prenom=$2, poste=$3, telephone=$4, email=$5, date_embauche=$6 WHERE id=$7',
      [nom, prenom, poste, telephone || null, email || null, date_embauche || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE employees SET actif=0 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
