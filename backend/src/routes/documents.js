const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  }
});
const upload = multer({ storage });

// Upload un document
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier uploadé' });

  const { type, transaction_id, nom } = req.body;
  if (!type || !['admin', 'justificatif', 'reconnaissance'].includes(type)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Type de document invalide' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const docNom = nom || req.file.originalname;
  const tId = transaction_id ? parseInt(transaction_id) : null;

  try {
    const { rows: insertRows } = await pool.query(
      'INSERT INTO documents (nom, type, file_url, transaction_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [docNom, type, fileUrl, tId]
    );
    
    const docId = insertRows[0].id;
    const reference = `DOC-${docId.toString().padStart(4, '0')}`;
    await pool.query('UPDATE documents SET reference = $1 WHERE id = $2', [reference, docId]);
    
    const { rows: selectRows } = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
    res.status(201).json(selectRows[0]);
  } catch (error) {
    console.error(error);
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
  }
});

// Liste des documents administratifs (type = admin)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE type = $1 ORDER BY created_at DESC', ['admin']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des documents pour une transaction
router.get('/transaction/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE transaction_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un document
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });

    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);

    const filePath = path.join(__dirname, '../../', doc.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
