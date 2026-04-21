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
      dateFilter = ' AND date >= $1 AND date <= $2';
      params = [date_debut, date_fin];
    } else if (date_debut) {
      dateFilter = ' AND date = $1';
      params = [date_debut];
    } else if (date_fin) {
      dateFilter = ' AND date = $1';
      params = [date_fin];
    }

    // 1. Documents (Réunions internes / Admin)
    let docFilter = '';
    let docParams = [];
    if (date_debut && date_fin) { docFilter = ' AND DATE(created_at) >= $1 AND DATE(created_at) <= $2'; docParams = [date_debut, date_fin]; }
    else if (date_debut) { docFilter = ' AND DATE(created_at) = $1'; docParams = [date_debut]; }
    else if (date_fin) { docFilter = ' AND DATE(created_at) = $1'; docParams = [date_fin]; }
    
    // docs Live 
    const { rows: docsLive } = await pool.query(`SELECT id, nom, created_at FROM documents WHERE type = 'admin' ${docFilter} ORDER BY created_at ASC`, docParams);
    
    // docs Archives (type='reunion')
    let arcDocFilter = '';
    if (date_debut && date_fin) { arcDocFilter = ' AND date >= $1 AND date <= $2'; }
    else if (date_debut) { arcDocFilter = ' AND date = $1';  }
    else if (date_fin) { arcDocFilter = ' AND date = $1'; }
    const { rows: docsArc } = await pool.query(`SELECT id, libelle as nom, date as created_at FROM archived_operations WHERE type = 'reunion' ${arcDocFilter} ORDER BY date ASC`, params);
    
    const docs = [...docsLive, ...docsArc];

    // 2. Fonctionnement interne (Entrees et Sorties) -> nature = 'fonctionnement' in live OR projet_nom IS NULL in archives
    const fEntreesQuery = `
      SELECT devise, SUM(montant) as total FROM (
        SELECT devise, montant FROM transactions WHERE nature = 'fonctionnement' AND type = 'entree' ${dateFilter.replace(/date/g, 'date')}
        UNION ALL
        SELECT currency as devise, montant FROM archived_operations WHERE (projet_nom IS NULL OR projet_nom = '') AND type = 'entree' ${dateFilter.replace(/date/g, 'date')}
      ) as combined GROUP BY devise
    `;
    const { rows: f_entrees } = await pool.query(fEntreesQuery, params);

    const fSortiesQuery = `
      SELECT devise, SUM(montant) as total FROM (
        SELECT devise, montant FROM transactions WHERE nature = 'fonctionnement' AND type = 'sortie' ${dateFilter.replace(/date/g, 'date')}
        UNION ALL
        SELECT currency as devise, montant FROM archived_operations WHERE (projet_nom IS NULL OR projet_nom = '') AND type = 'sortie' ${dateFilter.replace(/date/g, 'date')}
      ) as combined GROUP BY devise
    `;
    const { rows: f_sorties } = await pool.query(fSortiesQuery, params);


    let f_transactions = [];
    if (type === 'detaille') {
      const { rows: ft } = await pool.query(`
        SELECT date, montant, devise, type, description, category_nom, emp_nom, emp_prenom FROM (
          SELECT t.date, t.montant, t.devise, t.type, t.description, 
                 c.nom as category_nom, e.nom as emp_nom, e.prenom as emp_prenom
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN employees e ON t.employee_id = e.id
          WHERE t.nature = 'fonctionnement' ${dateFilter.replace(/date/g, 't.date')}
          
          UNION ALL
          
          SELECT date, montant, currency as devise, type, libelle as description, 
                 'Archive' as category_nom, responsable as emp_nom, '' as emp_prenom
          FROM archived_operations
          WHERE (projet_nom IS NULL OR projet_nom = '') AND type IN ('entree', 'sortie') ${dateFilter}
        ) as all_f
        ORDER BY date ASC
      `, params);
      f_transactions = ft;
    }

    // 3. Projets (nature = 'projet' in live OR projet_nom IS NOT NULL in archives)
    const { rows: projExp } = await pool.query(`
      SELECT p_id as id, p_nom as nom, p_statut as statut, budget_usd, budget_cdf, SUM(montant) as total_depense, devise as devise_depense FROM (
        SELECT p.id as p_id, p.nom as p_nom, p.statut as p_statut, p.budget_usd, p.budget_cdf, t.montant, t.devise
        FROM projects p
        INNER JOIN transactions t ON p.id = t.project_id
        WHERE t.nature = 'projet' AND t.type = 'sortie' ${dateFilter.replace(/date/g, 't.date')}
        
        UNION ALL
        
        SELECT 
          projet_id as p_id, 
          projet_nom as p_nom, 
          'Archive' as p_statut, 
          0 as budget_usd, 0 as budget_cdf, montant, currency as devise
        FROM archived_operations
        WHERE projet_nom IS NOT NULL AND projet_nom != '' AND type = 'sortie' ${dateFilter}
      ) as combined_p
      GROUP BY p_id, p_nom, p_statut, budget_usd, budget_cdf, devise
    `, params);

    let projTransactions = [];
    if (type === 'detaille') {
      const { rows: pt } = await pool.query(`
        SELECT project_id, date, montant, devise, description, category_nom, emp_nom, emp_prenom FROM (
          SELECT t.project_id as project_id, t.date, t.montant, t.devise, t.description,
                 c.nom as category_nom, e.nom as emp_nom, e.prenom as emp_prenom, p.nom as p_nom
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN employees e ON t.employee_id = e.id
          LEFT JOIN projects p ON t.project_id = p.id
          WHERE t.nature = 'projet' ${dateFilter.replace(/date/g, 't.date')}
          
          UNION ALL
          
          SELECT projet_id as project_id, date, montant, currency as devise, libelle as description,
                 'Archive' as category_nom, responsable as emp_nom, '' as emp_prenom, projet_nom as p_nom
          FROM archived_operations
          WHERE projet_nom IS NOT NULL AND projet_nom != '' AND type = 'sortie' ${dateFilter}
        ) as all_pt
        ORDER BY date ASC
      `, params);
      projTransactions = pt;
    }

    const reportData = {
      titre: `Rapport ${type === 'detaille' ? 'Détaillé' : 'Rapide'} - ${date_debut && date_fin ? `Du ${date_debut} au ${date_fin}` : date_debut ? date_debut : 'Toutes périodes'}`,
      type,
      date_debut: date_debut || null,
      date_fin: date_fin || null,
      documents: docs,
      fonctionnement: {
        entrees: f_entrees,
        sorties: f_sorties,
        transactions: f_transactions
      },
      projets: projExp.map(p => ({
        ...p,
        // Match by id or by name to support legacy string projects
        transactions: projTransactions.filter(pt => pt.project_id === p.id || pt.p_nom === p.nom)
      })),
      generated_at: new Date().toISOString()
    };

    const contenuJson = JSON.stringify(reportData);

    const { rows: reportRows } = await pool.query(
      `INSERT INTO reports (titre, type, date_debut, date_fin, contenu, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [reportData.titre, type, date_debut || null, date_fin || null, contenuJson, req.user.id]
    );

    res.status(201).json({ id: reportRows[0].id, ...reportData });
  } catch (err) {
    console.error(err);
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
