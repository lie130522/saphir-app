const express = require('express');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Dashboard summary
router.get('/dashboard', authenticate, async (req, res) => {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  try {
    // Balances per account
    const { rows: accounts } = await pool.query('SELECT * FROM accounts ORDER BY type, devise, nom');
    const accountsWithBalance = await Promise.all(accounts.map(async (a) => {
      const { rows: entrees } = await pool.query('SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE account_id=$1 AND type=$2', [a.id, 'entree']);
      const { rows: sorties } = await pool.query('SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE account_id=$1 AND type=$2', [a.id, 'sortie']);
      return { ...a, solde_actuel: Number(a.solde_initial) + Number(entrees[0].total) - Number(sorties[0].total) };
    }));

    // This month income/expense by devise
    const { rows: mEntUSD } = await pool.query("SELECT COALESCE(SUM(t.montant),0) as total FROM transactions t JOIN accounts a ON t.account_id=a.id WHERE t.type='entree' AND t.date >= $1 AND t.date <= $2 AND t.devise='USD'", [firstOfMonth, today]);
    const { rows: mSortUSD } = await pool.query("SELECT COALESCE(SUM(t.montant),0) as total FROM transactions t JOIN accounts a ON t.account_id=a.id WHERE t.type='sortie' AND t.date >= $1 AND t.date <= $2 AND t.devise='USD'", [firstOfMonth, today]);
    const { rows: mEntCDF } = await pool.query("SELECT COALESCE(SUM(t.montant),0) as total FROM transactions t JOIN accounts a ON t.account_id=a.id WHERE t.type='entree' AND t.date >= $1 AND t.date <= $2 AND t.devise='CDF'", [firstOfMonth, today]);
    const { rows: mSortCDF } = await pool.query("SELECT COALESCE(SUM(t.montant),0) as total FROM transactions t JOIN accounts a ON t.account_id=a.id WHERE t.type='sortie' AND t.date >= $1 AND t.date <= $2 AND t.devise='CDF'", [firstOfMonth, today]);

    // Last 5 transactions
    const { rows: recentTransactions } = await pool.query(`
      SELECT t.*, a.nom as account_nom, c.nom as category_nom, p.nom as project_nom,
             e.nom as emp_nom, e.prenom as emp_prenom
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN employees e ON t.employee_id = e.id
      ORDER BY t.date DESC, t.id DESC LIMIT 5
    `);

    // Project and employee counts
    const { rows: activeProjects } = await pool.query("SELECT COUNT(*) as c FROM projects WHERE statut='actif'");
    const { rows: totalEmployees } = await pool.query("SELECT COUNT(*) as c FROM employees WHERE actif=1");
    const { rows: totalTransactions } = await pool.query("SELECT COUNT(*) as c FROM transactions");

    // Disbursements (reimbursable expenses)
    const { rows: disbUSD } = await pool.query("SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE is_remboursable=1 AND devise='USD'");
    const { rows: disbCDF } = await pool.query("SELECT COALESCE(SUM(montant),0) as total FROM transactions WHERE is_remboursable=1 AND devise='CDF'");

    // Monthly chart data (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      
      const { rows: e_usd } = await pool.query("SELECT COALESCE(SUM(montant),0) as t FROM transactions WHERE type='entree' AND devise='USD' AND date >= $1 AND date <= $2", [start, endStr]);
      const { rows: s_usd } = await pool.query("SELECT COALESCE(SUM(montant),0) as t FROM transactions WHERE type='sortie' AND devise='USD' AND date >= $1 AND date <= $2", [start, endStr]);
      const { rows: e_cdf } = await pool.query("SELECT COALESCE(SUM(montant),0) as t FROM transactions WHERE type='entree' AND devise='CDF' AND date >= $1 AND date <= $2", [start, endStr]);
      const { rows: s_cdf } = await pool.query("SELECT COALESCE(SUM(montant),0) as t FROM transactions WHERE type='sortie' AND devise='CDF' AND date >= $1 AND date <= $2", [start, endStr]);
      
      chartData.push({ label, entrees_usd: e_usd[0].t, sorties_usd: s_usd[0].t, entrees_cdf: e_cdf[0].t, sorties_cdf: s_cdf[0].t });
    }

    res.json({
      accounts: accountsWithBalance,
      month: {
        entrees_usd: mEntUSD[0].total,
        sorties_usd: mSortUSD[0].total,
        entrees_cdf: mEntCDF[0].total,
        sorties_cdf: mSortCDF[0].total,
      },
      recentTransactions,
      stats: {
        activeProjects: activeProjects[0].c,
        totalEmployees: totalEmployees[0].c,
        totalTransactions: totalTransactions[0].c,
        disbursements_usd: disbUSD[0].total,
        disbursements_cdf: disbCDF[0].total,
      },
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Report
router.get('/report', authenticate, async (req, res) => {
  const { date_debut, date_fin, account_id, type, nature, project_id, devise } = req.query;
  let where = [];
  let params = [];
  let pIdx = 1;

  if (date_debut) { where.push(`t.date >= $${pIdx++}`); params.push(date_debut); }
  if (date_fin) { where.push(`t.date <= $${pIdx++}`); params.push(date_fin); }
  if (account_id) { where.push(`t.account_id = $${pIdx++}`); params.push(account_id); }
  if (type) { where.push(`t.type = $${pIdx++}`); params.push(type); }
  if (nature) { where.push(`t.nature = $${pIdx++}`); params.push(nature); }
  if (project_id) { where.push(`t.project_id = $${pIdx++}`); params.push(project_id); }
  if (devise) { where.push(`t.devise = $${pIdx++}`); params.push(devise); }

  const sql = `
    SELECT t.*, a.nom as account_nom, c.nom as category_nom, c.nature as category_nature,
           p.nom as project_nom, e.nom as emp_nom, e.prenom as emp_prenom
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN employees e ON t.employee_id = e.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.date ASC
  `;

  try {
    const { rows } = await pool.query(sql, params);

    const totals = { entrees: {}, sorties: {} };
    rows.forEach(r => {
      const d = r.devise;
      if (r.type === 'entree') { totals.entrees[d] = (Number(totals.entrees[d]) || 0) + Number(r.montant); }
      else { totals.sorties[d] = (Number(totals.sorties[d]) || 0) + Number(r.montant); }
    });

    if (rows.length > 0) {
      const tIds = rows.map(r => r.id);
      // Construct IN clause dynamically $1,$2...
      const inClause = tIds.map((_, i) => `$${i+1}`).join(',');
      const { rows: docs } = await pool.query(`SELECT transaction_id, reference FROM documents WHERE transaction_id IN (${inClause})`, tIds);
      
      rows.forEach(r => {
        r.document_refs = docs.filter(d => d.transaction_id === r.id).map(d => d.reference).filter(Boolean);
      });
    }

    res.json({ transactions: rows, totals });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get all narrative reports history
router.get('/narrative/history', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, titre, type, date_debut, date_fin, created_at, user_id FROM reports ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get single narrative report content
router.get('/narrative/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Rapport introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Generate and save a new narrative report
router.post('/narrative/generate', authenticate, requireRole('admin', 'comptable'), async (req, res) => {
  const { type, date_debut, date_fin } = req.body;
  if (!type) return res.status(400).json({ error: 'Le type de rapport est requis' });

  try {
    let dateFilter = '';
    let params = [];
    if (date_debut && date_fin) {
      dateFilter = ' AND t.date >= $1 AND t.date <= $2';
      params = [date_debut, date_fin];
    } else if (date_debut) {
      dateFilter = ' AND t.date = $1';
      params = [date_debut];
    } else if (date_fin) {
      dateFilter = ' AND t.date = $1';
      params = [date_fin];
    }

    // 1. Documents (Réunions internes / Admin)
    let docFilter = '';
    let docParams = [];
    if (date_debut && date_fin) { docFilter = ' AND DATE(created_at) >= $1 AND DATE(created_at) <= $2'; docParams = [date_debut, date_fin]; }
    else if (date_debut) { docFilter = ' AND DATE(created_at) = $1'; docParams = [date_debut]; }
    else if (date_fin) { docFilter = ' AND DATE(created_at) = $1'; docParams = [date_fin]; }
    
    const { rows: docs } = await pool.query(`SELECT id, nom, created_at FROM documents WHERE type = 'admin' ${docFilter} ORDER BY created_at ASC`, docParams);

    // 2. Fonctionnement interne (Entrees et Sorties)
    const { rows: f_entrees } = await pool.query(`SELECT devise, SUM(montant) as total FROM transactions t WHERE nature = 'fonctionnement' AND type = 'entree' ${dateFilter} GROUP BY devise`, params);
    const { rows: f_sorties } = await pool.query(`SELECT devise, SUM(montant) as total FROM transactions t WHERE nature = 'fonctionnement' AND type = 'sortie' ${dateFilter} GROUP BY devise`, params);

    // 3. Projets
    const { rows: projExp } = await pool.query(`
      SELECT p.id, p.nom, p.statut, p.budget_usd, p.budget_cdf, SUM(t.montant) as total_depense, t.devise as devise_depense
      FROM projects p
      LEFT JOIN transactions t ON p.id = t.project_id
      WHERE t.nature = 'projet' AND t.type = 'sortie' ${dateFilter.replace(/t\.date/g, 't.date')}
      GROUP BY p.id, t.devise
    `, params);

    const reportData = {
      titre: `Rapport ${type === 'detaille' ? 'Détaillé' : 'Rapide'} - ${date_debut && date_fin ? `Du ${date_debut} au ${date_fin}` : date_debut ? date_debut : 'Toutes périodes'}`,
      type,
      date_debut: date_debut || null,
      date_fin: date_fin || null,
      documents: docs,
      fonctionnement: {
        entrees: f_entrees,
        sorties: f_sorties
      },
      projets: projExp,
      generated_at: new Date().toISOString()
    };

    const contenuJson = JSON.stringify(reportData);

    const { rows: reportRows } = await pool.query(
      `INSERT INTO reports (titre, type, date_debut, date_fin, contenu, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [reportData.titre, type, date_debut || null, date_fin || null, contenuJson, req.user.id]
    );

    res.status(201).json({ id: reportRows[0].id, ...reportData });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/narrative/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
