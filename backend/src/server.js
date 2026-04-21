require('dotenv').config();
const express = require('express');
const cors = require('cors');

const compression = require('compression');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

const path = require('path');

app.use(compression());
app.use(cors({ 
  origin: [/localhost:\d+/],
  credentials: true 
}));
app.use(express.json());

// Servir statiquement le dossier des uploads générés
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/search', require('./routes/search'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Saphir API', version: '1.0.0' }));

// Serve frontend statically in production only
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler (Must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Saphir API démarré sur http://localhost:${PORT}`);
});
