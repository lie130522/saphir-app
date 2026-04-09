const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'saphir.db');
const db = new Database(DB_PATH);

console.log('Running document migration...');

try {
  db.exec('ALTER TABLE documents ADD COLUMN reference TEXT;');
  console.log('Added reference to documents');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column reference already exists in documents');
  } else {
    console.error('Error adding reference:', e.message);
  }
}

db.close();
console.log('Migrations complete.');
