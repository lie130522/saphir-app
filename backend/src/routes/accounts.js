const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

async function getAccountBalance(accountId) {
  const { rows: accountRows } = await pool.query('SELECT solde_initial FROM accounts WHERE id=$1', [accountId]);
  if (!accountRows.length) return 0;
  
  const { rows: entrees } = await pool.query('SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE account_id=$1 AND type=$2', [accountId, 'entree']);
  const { rows: sorties } = await pool.query('SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE account_id=$1 AND type=$2', [accountId, 'sortie']);
  
  return Number(accountRows[0].solde_initial) + Number(entrees[0].total) - Number(sorties[0].total);
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows: accounts } = await pool.query('SELECT * FROM accounts ORDER BY type, devise, nom');
    const result = await Promise.all(accounts.map(async (a) => ({ 
      ...a, 
      solde_actuel: await getAccountBalance(a.id) 
    })));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { nom, type, devise, solde_initial } = req.body;
  if (!nom || !type || !devise) return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO accounts (nom, type, devise, solde_initial) VALUES ($1,$2,$3,$4) RETURNING id',
      [nom, type, devise, solde_initial || 0]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nom, type, devise, solde_initial } = req.body;
  try {
    await pool.query(
      'UPDATE accounts SET nom=$1, type=$2, devise=$3, solde_initial=$4 WHERE id=$5',
      [nom, type, devise, solde_initial || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as c FROM transactions WHERE account_id=$1', [req.params.id]);
    if (parseInt(rows[0].c) > 0) return res.status(400).json({ error: 'Ce compte a des transactions associées' });
    
    await pool.query('DELETE FROM accounts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
module.exports.getAccountBalance = getAccountBalance;
