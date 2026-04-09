require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function initDB() {
  try {
    await client.connect();
    console.log('Connecté à PostgreSQL. Création des tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        prenom VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        telephone VARCHAR(20),
        password TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'comptable',
        actif INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        prenom VARCHAR(255) NOT NULL,
        poste VARCHAR(255) NOT NULL,
        telephone VARCHAR(20),
        email VARCHAR(255),
        date_embauche DATE,
        actif INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        client VARCHAR(255),
        budget_usd DECIMAL(15,2) DEFAULT 0,
        budget_cdf DECIMAL(15,2) DEFAULT 0,
        statut VARCHAR(50) DEFAULT 'actif',
        date_debut DATE,
        date_fin DATE,
        description TEXT,
        type_gestion VARCHAR(50) DEFAULT 'plein_pouvoir',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        devise VARCHAR(3) NOT NULL,
        solde_initial DECIMAL(15,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        nature VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        montant DECIMAL(15,2) NOT NULL,
        devise VARCHAR(3) NOT NULL,
        account_id INTEGER REFERENCES accounts(id),
        category_id INTEGER REFERENCES categories(id),
        nature VARCHAR(50) NOT NULL,
        project_id INTEGER REFERENCES projects(id),
        employee_id INTEGER REFERENCES employees(id),
        user_id INTEGER REFERENCES users(id),
        description TEXT,
        reference TEXT,
        is_remboursable INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        reference VARCHAR(50),
        type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        transaction_id INTEGER REFERENCES transactions(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        titre VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date_debut DATE,
        date_fin DATE,
        contenu JSONB NOT NULL,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert minimal seeding if tables are empty
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      console.log("Création de l'admin initial...");
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (nom, email, password, role) VALUES ($1, $2, $3, $4)',
        ['Admin', 'admin@saphir.cd', hash, 'admin']
      );

      console.log('Insérer les comptes de base...');
      await client.query(`
        INSERT INTO accounts (nom, type, devise, solde_initial) VALUES 
        ('Caisse USD', 'caisse', 'USD', 0),
        ('Caisse CDF', 'caisse', 'CDF', 0)
      `);

      console.log('Insérer les catégories de base...');
      await client.query(`
        INSERT INTO categories (nom, type, nature) VALUES 
        ('Paiement Fournisseur', 'sortie', 'projet'),
        ('Salaire', 'sortie', 'fonctionnement'),
        ('Achat Carburant', 'sortie', 'fonctionnement'),
        ('Recouvrement Facture', 'entree', 'fonctionnement')
      `);
    }

    console.log('✅ Base de données PostgreSQL initialisée avec succès !');
  } catch (err) {
    console.error("Erreur lors de l'initialisation :", err);
  } finally {
    await client.end();
  }
}

initDB();
