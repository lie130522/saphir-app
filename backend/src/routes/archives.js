const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const pool = require('../db/database');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `archive_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// Get aggregated list of imported months
router.get('/months', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT month_year, 
             COUNT(*) as tx_count, 
             MAX(imported_at) as imported_at
      FROM archived_operations
      GROUP BY month_year
      ORDER BY month_year DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Import excel file
router.post('/import', authenticate, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Veuillez uploader un fichier Excel.' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Format attendu des colonnes: Date, Type, Libelle, Montant, Currency, Sens, Justificatif, Responsable, Projet
    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le fichier Excel est vide.' });
    }

    let inserted = 0;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const row of data) {
        // Validation simple
        if (!row.Date || !row.Libelle || !row.Type) continue;

        // Parse date - Excel peut avoir des dates formatées, on assume un format lisible YYYY-MM-DD
        let rowDate = row.Date;
        if (typeof rowDate === 'number') {
          // Convert Excel serial date to JS Date
          rowDate = new Date(Math.round((rowDate - 25569) * 864e5)).toISOString().split('T')[0];
        } else if (typeof rowDate === 'string') {
          // just taking the first 10 chars assuming YYYY-MM-DD or attempting parse
          const parsed = new Date(rowDate);
          if (!isNaN(parsed.getTime())) {
            rowDate = parsed.toISOString().split('T')[0];
          }
        }
        
        const monthYear = String(rowDate).substring(0, 7); // YYYY-MM

        await client.query(`
          INSERT INTO archived_operations 
          (date, type, libelle, montant, currency, sens, justificatif_url, responsable, projet_nom, month_year)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          rowDate,
          row.Type.toLowerCase(),
          row.Libelle,
          parseFloat(row.Montant) || 0,
          row.Currency || 'USD',
          row.Sens ? row.Sens.toLowerCase() : null,
          row.Justificatif || null,
          row.Responsable || null,
          row.Projet || null,
          monthYear
        ]);
        inserted++;
      }
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    fs.unlinkSync(req.file.path); // Remove the temp file
    res.json({ message: `${inserted} opérations importées avec succès.` });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erreur lors de l\'importation du fichier.' });
  }
});

// Download strictly formatted template
router.get('/template', authenticate, (req, res) => {
  const wb = xlsx.utils.book_new();
  const wsData = [
    ["Date", "Type", "Libelle", "Montant", "Currency", "Sens", "Justificatif", "Responsable", "Projet"],
    ["2026-04-01", "sortie", "Achat de fournitures", "150.00", "USD", "sortie", "Facture123.pdf", "Jean Doe", "Projet Beta"],
    ["2026-04-02", "entree", "Paiement client", "500.00", "USD", "entree", "", "Alice", "Projet Alpha"],
    ["2026-04-03", "reunion", "CR Réunion Direction", "0", "", "", "https://lien/verse/cr", "Bob", ""]
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  xlsx.utils.book_append_sheet(wb, ws, "Modele");
  
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename="saphir_modele_import.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
