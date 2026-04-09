require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connecté à PostgreSQL pour la migration OTP...');
    
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP;
    `);
    
    console.log('✅ Colonnes OTP ajoutées avec succès !');
  } catch (err) {
    console.error('Erreur lors de la migration OTP :', err);
  } finally {
    await client.end();
  }
}

migrate();
