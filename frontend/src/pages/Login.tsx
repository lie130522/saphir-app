import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

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
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">S</div>
          <h1>Saphir</h1>
          <p>Système de gestion administrative</p>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input title="Adresse email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@saphir.cd" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input title="Mot de passe" type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading}>
            {loading ? '⏳ Connexion...' : '🔑 Se connecter'}
          </button>
        </form>
        <p className="text-center mt-4 text-[11px] text-muted">
          Compte par défaut: admin@saphir.cd / admin123
        </p>
      </div>
    </div>
  );
}
