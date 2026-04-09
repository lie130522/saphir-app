const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sendVerificationCode } = require('../services/emailService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'saphir_secret_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND actif = 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

    // Note: the original column name was password_hash, but the new init_pg.js creates it as 'password'
    // I will use user.password to check.
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });

    const token = jwt.sign({ id: user.id, nom: user.nom, email: user.email, role: user.role, telephone: user.telephone }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role, telephone: user.telephone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, email, role, telephone FROM users WHERE id = $1', [req.user.id]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/users - admin only
router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, email, role, telephone, actif, created_at FROM users ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/users - admin only
router.post('/users', authenticate, requireRole('admin'), async (req, res) => {
  const { nom, email, password, role, telephone } = req.body;
  if (!nom || !email || !password || !role) return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (nom, email, password, role, telephone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [nom, email, hash, role, telephone || null]
    );
    res.status(201).json({ id: result.rows[0].id, nom, email, role, telephone });
  } catch (e) {
    res.status(400).json({ error: 'Email déjà utilisé ou erreur serveur' });
  }
});

// PUT /api/auth/users/:id - admin only
router.put('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nom, email, role, actif, password, telephone } = req.body;
  const { id } = req.params;
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query(
        'UPDATE users SET nom=$1, email=$2, role=$3, actif=$4, telephone=$5, password=$6 WHERE id=$7',
        [nom, email, role, actif !== undefined ? actif : 1, telephone || null, hash, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET nom=$1, email=$2, role=$3, actif=$4, telephone=$5 WHERE id=$6',
        [nom, email, role, actif !== undefined ? actif : 1, telephone || null, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/auth/users/:id - admin only
router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
  try {
    await pool.query('UPDATE users SET actif = 0 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  const { nom, email, telephone } = req.body;
  if (!nom || !email) return res.status(400).json({ error: 'Noms et Email requis' });
  try {
    await pool.query(
      'UPDATE users SET nom=$1, email=$2, telephone=$3 WHERE id=$4',
      [nom, email, telephone || null, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows: transactions } = await pool.query(`
      SELECT t.id, t.date, t.montant, t.devise, t.type, t.description, 
             a.nom as account_nom, c.nom as category_nom, p.nom as project_nom
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/request-otp
router.post('/request-otp', authenticate, async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [code, expires, req.user.id]
    );

    // Get the current email (or the one they want to use if we allow changing to a new one)
    // For now, send to the current authenticated user's email
    await sendVerificationCode(req.user.email, code);

    res.json({ success: true, message: 'Code envoyé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
  }
});

// POST /api/auth/verify-update
router.post('/verify-update', authenticate, async (req, res) => {
  const { code, newEmail, newPassword, newNom, newTelephone } = req.body;
  if (!code) return res.status(400).json({ error: 'Code de vérification requis' });

  try {
    const { rows } = await pool.query(
      'SELECT otp_code, otp_expires FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = rows[0];

    if (!user.otp_code || user.otp_code !== code) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: 'Code expiré' });
    }

    // Clear OTP and update user
    let query = 'UPDATE users SET otp_code = NULL, otp_expires = NULL, nom = $1, email = $2, telephone = $3';
    let params = [newNom || req.user.nom, newEmail || req.user.email, newTelephone || req.user.telephone];

    if (newPassword) {
      query += ', password = $4';
      params.push(bcrypt.hashSync(newPassword, 10));
    }

    query += ' WHERE id = $' + (params.length + 1);
    params.push(req.user.id);

    await pool.query(query, params);

    res.json({ success: true, message: 'Compte mis à jour avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

module.exports = router;
