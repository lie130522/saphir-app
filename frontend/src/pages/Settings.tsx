import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import type { CompanySettings, Transaction } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';

export default function Settings() {
  const { isAdmin, user, loadUser } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useSettings();
  const navigate = useNavigate();
  
  const [resetConfirm, setResetConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  // Profil Form
  const [profilForm, setProfilForm] = useState({ nom: '', email: '', telephone: '' });
  const [savingProfil, setSavingProfil] = useState(false);
  
  // Historique
  const [history, setHistory] = useState<Transaction[]>([]);

  // Company Settings Form
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    company_email: '',
    company_phone: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (user) {
      setProfilForm({
        nom: user.nom || '',
        email: user.email || '',
        telephone: user.telephone || ''
      });
      loadHistory();
    }
    
    if (isAdmin) {
      loadCompanySettings();
    }
  }, [user, isAdmin]);

  const loadHistory = async () => {
    try {
      const res = await API.get('/auth/history');
      setHistory(res.data.transactions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const res = await API.get('/settings');
      setCompanySettings(prev => ({ ...prev, ...res.data }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      await API.put('/auth/profile', profilForm);
      await loadUser(); // Reload to update auth context
      alert(language === 'fr' ? 'Profil mis à jour' : 'Profile updated');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erreur');
    } finally {
      setSavingProfil(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await API.post('/settings', companySettings);
      alert(language === 'fr' ? 'Paramètres société enregistrés' : 'Company settings saved');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erreur');
    } finally {
      setSavingCompany(false);
    }
  };

  async function handleResetApp() {
    if (resetConfirm !== 'PRODUCTION') {
      alert("Veuillez taper PRODUCTION pour confirmer la réinitialisation.");
      return;
    }
    
    if (!confirm("⚠️ ATTENTION : Cette action est irréversible. Toutes les données de test (Transactions, Documents, Rapports) seront définitivement supprimées. Voulez-vous continuer ?")) {
      return;
    }

    setLoading(true);
    try {
      await API.post('/admin/reset');
      alert("L'application a été réinitialisée avec succès ! Passage en mode production effectué.");
      setResetConfirm('');
      navigate('/');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={language === 'fr' ? 'Paramètres' : 'Settings'} subtitle={language === 'fr' ? 'Configuration de l’application' : 'App configuration'}>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px]">
        
        <div className="flex-col-gap-6">
          {/* PROFIL SECTION */}
          <div className="card">
            <h3 className="mb-4">{language === 'fr' ? 'Mon Profil' : 'My Profile'}</h3>
            <div className="flex-center-gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="avatar-lg bg-primary text-white fw-bold">
                {user?.nom?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-lg fw-semibold">{user?.prenom} {user?.nom}</div>
                <div className="text-muted">{user?.email}</div>
                <div className="mt-1"><span className="badge badge-purple">{language === 'fr' ? 'Rôle' : 'Role'}: {user?.role}</span></div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfil} className="flex-col-gap-4">
              <div className="form-group">
                <label className="form-label">{language === 'fr' ? 'Nom complet' : 'Full Name'}</label>
                <input 
                  type="text" 
                  title={language === 'fr' ? 'Nom complet' : 'Full Name'}
                  className="form-input" 
                  value={profilForm.nom} 
                  onChange={e => setProfilForm({...profilForm, nom: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  title="Email"
                  className="form-input" 
                  value={profilForm.email} 
                  onChange={e => setProfilForm({...profilForm, email: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{language === 'fr' ? 'Téléphone' : 'Phone'}</label>
                <input 
                  type="tel" 
                  title={language === 'fr' ? 'Téléphone' : 'Phone'}
                  className="form-input" 
                  value={profilForm.telephone} 
                  onChange={e => setProfilForm({...profilForm, telephone: e.target.value})} 
                />
              </div>
              <button disabled={savingProfil} type="submit" className="btn btn-primary self-start mt-2">
                {savingProfil ? '...' : (language === 'fr' ? 'Mettre à jour le profil' : 'Update profile')}
              </button>
            </form>
          </div>

          {/* PREFERENCES SECTION */}
          <div className="card">
            <h3 className="mb-4">{language === 'fr' ? 'Préférences' : 'Preferences'}</h3>
            
            <div className="form-group">
              <label className="form-label">{language === 'fr' ? 'Thème d’affichage' : 'Display Theme'}</label>
              <div className="flex-gap-2">
                <button 
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                  onClick={() => theme === 'dark' && toggleTheme()}
                >
                  ☀️ {language === 'fr' ? 'Clair' : 'Light'}
                </button>
                <button 
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                  onClick={() => theme === 'light' && toggleTheme()}
                >
                  🌙 {language === 'fr' ? 'Sombre' : 'Dark'}
                </button>
              </div>
            </div>

            <div className="form-group mt-4">
              <label className="form-label">{language === 'fr' ? 'Langue' : 'Language'}</label>
              <div className="flex-gap-2">
                <button 
                  className={`btn ${language === 'fr' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                  onClick={() => setLanguage('fr')}
                >
                  🇫🇷 Français
                </button>
                <button 
                  className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                  onClick={() => setLanguage('en')}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col-gap-6">
          {/* SOCIETE SECTION (ADMIN ONLY) */}
          {isAdmin && (
            <div className="card border-blue-200">
              <h3 className="mb-4 text-blue-800">{language === 'fr' ? 'Profil de la Société' : 'Company Profile'}</h3>
              <form onSubmit={handleUpdateCompany} className="flex-col-gap-4">
                <div className="form-group">
                  <label className="form-label">{language === 'fr' ? 'Nom de la société' : 'Company Name'}</label>
                  <input 
                    type="text" 
                    title={language === 'fr' ? 'Nom de la société' : 'Company Name'}
                    className="form-input" 
                    value={companySettings.company_name || ''} 
                    onChange={e => setCompanySettings({...companySettings, company_name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email de contact</label>
                  <input 
                    type="email" 
                    title="Email de contact"
                    className="form-input" 
                    value={companySettings.company_email || ''} 
                    onChange={e => setCompanySettings({...companySettings, company_email: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone de contact</label>
                  <input 
                    type="tel" 
                    title="Téléphone de contact"
                    className="form-input" 
                    value={companySettings.company_phone || ''} 
                    onChange={e => setCompanySettings({...companySettings, company_phone: e.target.value})} 
                  />
                </div>
                <button disabled={savingCompany} type="submit" className="btn btn-primary self-start mt-2">
                  {savingCompany ? '...' : (language === 'fr' ? 'Enregistrer les infos de la société' : 'Save company info')}
                </button>
              </form>
            </div>
          )}

          {/* HISTORY SECTION */}
          <div className="card">
            <h3 className="mb-4">{language === 'fr' ? 'Mon historique récent' : 'My recent history'}</h3>
            <div className="flex-col-gap-3">
              {history.length === 0 ? (
                <div className="text-muted text-sm italic">{language === 'fr' ? 'Aucune action récente.' : 'No recent actions.'}</div>
              ) : history.map(t => (
                <div key={t.id} className="p-3 border border-slate-100 rounded bg-slate-50 flex justify-between items-center">
                  <div>
                    <div className="text-sm fw-semibold">{t.description || t.category_nom}</div>
                    <div className="text-xs text-muted">
                      {t.project_nom ? `Projet: ${t.project_nom} • ` : ''} 
                      {formatDate(t.date || '')}
                    </div>
                  </div>
                  <div className={`fw-bold text-sm ${t.type === 'entree' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'entree' ? '+' : '-'}{formatMoney(t.montant, t.devise)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DANGER ZONE - ADMIN ONLY */}
        {isAdmin && (
          <div className="card col-span-full card-danger-outline mt-4">
            <h3 className="flex-center-gap-2 mb-2 text-danger">
              ⚠️ Zone de Danger : Passage en production
            </h3>
            <p className="mb-4 text-muted">
              Cette action va supprimer complètement toutes les <strong>Transactions</strong>, les <strong>Documents administratifs et justificatifs</strong>, ansi que l'historique des <strong>Rapports Narratifs</strong> de la base de données. 
            </p>
            
            <div className="bg-secondary-box p-4 rounded-md flex-col-gap-3">
              <label className="form-label text-danger">
                Pour confirmer, veuillez taper <strong>PRODUCTION</strong> ci-dessous :
              </label>
              <div className="flex-gap-3">
                <input 
                  title="Confirmation de réinitialisation"
                  type="text" 
                  className="form-input flex-1 uppercase" 
                  placeholder="Taper PRODUCTION"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                />
                <button 
                  className="btn btn-danger" 
                  onClick={handleResetApp}
                  disabled={loading || resetConfirm !== 'PRODUCTION'}
                >
                  {loading ? '⏳...' : '🧹 Vider les tests'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </Layout>
  );
}
