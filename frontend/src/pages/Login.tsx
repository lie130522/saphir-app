import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/useAuth';
import BackgroundAnimation from '../components/BackgroundAnimation';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@saphir.cd');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <BackgroundAnimation />
      <motion.div 
        className="login-card"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="login-logo">
          <motion.div 
            className="login-logo-icon"
            initial={{ rotate: -20, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
          >
            S
          </motion.div>
          <h1>Saphir</h1>
          <p>Système de gestion administrative</p>
        </div>

        {error && (
          <motion.div 
            className="error-msg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span>⚠️</span> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex-col-gap-4">
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input 
              title="Adresse email" 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="email@saphir.cd" 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input 
              title="Mot de passe" 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>
          <motion.button 
            type="submit" 
            className="btn btn-primary w-full justify-center mt-2" 
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
          </motion.button>
        </form>
        
        <div className="login-footer-info">
          <p>Compte par défaut : admin@saphir.cd / admin123</p>
          <p className="mt-2 opacity-50">&copy; 2026 Saphir Group. v4.2-premium-locked</p>
        </div>
      </motion.div>
    </div>
  );
}
