import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { useSettings } from '../contexts/useSettings';
import { useNavigate } from 'react-router-dom';
import type { CompanySettings, Transaction } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';
import type { AxiosError } from 'axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Settings() {
  const { isAdmin, user, loadUser } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useSettings();
  const navigate = useNavigate();
  
  const [resetConfirm, setResetConfirm] = useState('');
  const [profilForm, setProfilForm] = useState({ nom: '', email: '', telephone: '' });
  const [securityForm, setSecurityForm] = useState({ newEmail: '', newPassword: '', confirmPassword: '' });
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const { data: history = [] } = useQuery<Transaction[]>({
    queryKey: ['auth-history'],
    queryFn: () => API.get('/auth/history').then(r => r.data.transactions || []),
    enabled: !!user
  });

  const { data: companyData } = useQuery<CompanySettings>({
    queryKey: ['company-settings'],
    queryFn: () => API.get('/settings').then(r => r.data),
    enabled: !!isAdmin
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_logo: ''
  });

  useEffect(() => {
    if (user) {
      setProfilForm(prev => {
        if (prev.nom === (user.nom || '') && 
            prev.email === (user.email || '') && 
            prev.telephone === (user.telephone || '')) {
          return prev;
        }
        return {
          nom: user.nom || '',
          email: user.email || '',
          telephone: user.telephone || ''
        };
      });
    }
  }, [user]);

  useEffect(() => {
    if (companyData) {
      setCompanySettings(prev => {
        const isSame = Object.keys(companyData).every(k => prev[k] === companyData[k]);
        if (isSame) return prev;
        return { ...prev, ...companyData };
      });
    }
  }, [companyData]);

  const updateProfilMutation = useMutation({
    mutationFn: (data: typeof profilForm) => API.put('/auth/profile', data),
    onSuccess: () => {
      loadUser();
      alert(language === 'fr' ? 'Profil mis à jour' : 'Profile updated');
    },
    onError: (err: AxiosError<{error: string}>) => alert(err.response?.data?.error || 'Erreur')
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data: CompanySettings) => API.post('/settings', data),
    onSuccess: () => alert(language === 'fr' ? 'Paramètres société enregistrés' : 'Company settings saved'),
    onError: (err: AxiosError<{error: string}>) => alert(err.response?.data?.error || 'Erreur')
  });

  const requestOtpMutation = useMutation({
    mutationFn: () => API.post('/auth/request-otp'),
    onSuccess: () => {
      setShowOtpInput(true);
      alert(language === 'fr' ? 'Code de vérification envoyé à votre e-mail actuel' : 'Verification code sent to your current email');
    },
    onError: (err: AxiosError<{error: string}>) => alert(err.response?.data?.error || 'Erreur')
  });

  const verifyUpdateMutation = useMutation({
    mutationFn: (data: { code: string; newEmail?: string; newPassword?: string; newNom?: string; newTelephone?: string }) => API.post('/auth/verify-update', data),
    onSuccess: () => {
      alert(language === 'fr' ? 'Compte mis à jour avec succès' : 'Account updated successfully');
      setShowOtpInput(false);
      setSecurityForm({ newEmail: '', newPassword: '', confirmPassword: '' });
      setOtpCode('');
      loadUser();
    },
    onError: (err: AxiosError<{error: string}>) => alert(err.response?.data?.error || 'Erreur')
  });

  const resetMutation = useMutation({
    mutationFn: () => API.post('/admin/reset'),
    onSuccess: () => {
      alert("L'application a été réinitialisée avec succès ! Passage en mode production effectué.");
      setResetConfirm('');
      navigate('/');
    },
    onError: (err: AxiosError<{error: string}>) => alert(err.response?.data?.error || 'Erreur lors de la réinitialisation')
  });

  const handleUpdateProfil = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfilMutation.mutate(profilForm);
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(companySettings);
  };

  const handleRequestOtp = () => {
    if (securityForm.newPassword && securityForm.newPassword !== securityForm.confirmPassword) {
      alert(language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return;
    }
    requestOtpMutation.mutate();
  };

  const handleConfirmUpdate = () => {
    if (!otpCode) return;
    verifyUpdateMutation.mutate({
      code: otpCode,
      newEmail: securityForm.newEmail || undefined,
      newPassword: securityForm.newPassword || undefined,
      newNom: profilForm.nom || undefined,
      newTelephone: profilForm.telephone || undefined
    });
  };

  const handleResetApp = () => {
    if (resetConfirm !== 'PRODUCTION') {
      alert("Veuillez taper PRODUCTION pour confirmer la réinitialisation.");
      return;
    }
    if (!confirm("⚠️ ATTENTION : Cette action est irréversible. Toutes les données de test (Transactions, Documents, Rapports) seront définitivement supprimées. Voulez-vous continuer ?")) return;
    resetMutation.mutate();
  };

  return (
    <Layout title={language === 'fr' ? 'Paramètres' : 'Settings'} subtitle={language === 'fr' ? 'Configuration de l’application' : 'App configuration'}>
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex-col-gap-6">
          {/* PROFIL SECTION */}
          <motion.div className="card" variants={itemVariants}>
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
              <button disabled={updateProfilMutation.isPending} type="submit" className="btn btn-primary self-start mt-2">
                {updateProfilMutation.isPending ? '...' : (language === 'fr' ? 'Mettre à jour le profil' : 'Update profile')}
              </button>
            </form>
          </motion.div>

          {/* PREFERENCES SECTION */}
          <motion.div className="card" variants={itemVariants}>
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
          </motion.div>
        </div>

        <div className="flex-col-gap-6">
          {/* SOCIETE SECTION (ADMIN ONLY) */}
          {isAdmin && (
            <motion.div className="card border-blue-200" variants={itemVariants}>
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
                  <label className="form-label">URL du Logo (Lien image)</label>
                  <input 
                    type="text" 
                    title="URL du Logo"
                    className="form-input" 
                    placeholder="https://..."
                    value={companySettings.company_logo || ''} 
                    onChange={e => setCompanySettings({...companySettings, company_logo: e.target.value})} 
                  />
                </div>
                <button disabled={updateCompanyMutation.isPending} type="submit" className="btn btn-primary self-start mt-2">
                  {updateCompanyMutation.isPending ? '...' : (language === 'fr' ? 'Enregistrer les infos de la société' : 'Save company info')}
                </button>
              </form>
            </motion.div>
          )}

          {/* SECURITY SECTION */}
          <motion.div className="card" variants={itemVariants}>
            <h3 className="mb-4 text-slate-800">{language === 'fr' ? 'Sécurité et Accès' : 'Security & Access'}</h3>
            <p className="text-sm text-muted mb-4">
              {language === 'fr' 
                ? 'Pour modifier vos accès, un code de vérification sera envoyé à votre adresse e-mail actuelle.' 
                : 'To change your access, a verification code will be sent to your current email address.'}
            </p>

            <AnimatePresence mode="wait">
              {!showOtpInput ? (
                <motion.div 
                  key="security-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-col-gap-4"
                >
                  <div className="form-group">
                    <label className="form-label">{language === 'fr' ? 'Nouvel Email (Optionnel)' : 'New Email (Optional)'}</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="Laissez vide pour garder l'actuel"
                      value={securityForm.newEmail} 
                      onChange={e => setSecurityForm({...securityForm, newEmail: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{language === 'fr' ? 'Nouveau Mot de passe (Optionnel)' : 'New Password (Optional)'}</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Min. 6 caractères"
                      value={securityForm.newPassword} 
                      onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})} 
                    />
                  </div>
                  {securityForm.newPassword && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="confirmPassword">{language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm Password'}</label>
                      <input 
                        id="confirmPassword"
                        type="password" 
                        title={language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm Password'}
                        className="form-input" 
                        value={securityForm.confirmPassword} 
                        onChange={e => setSecurityForm({...securityForm, confirmPassword: e.target.value})} 
                      />
                    </div>
                  )}
                  <button 
                    onClick={handleRequestOtp} 
                    disabled={requestOtpMutation.isPending} 
                    className="btn btn-primary mt-2"
                  >
                    {requestOtpMutation.isPending ? '...' : (language === 'fr' ? 'Demander le code de vérification' : 'Request verification code')}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="otp-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-blue-50 p-4 rounded-md flex-col-gap-3 border border-blue-100"
                >
                  <label className="form-label font-bold text-blue-900">
                    {language === 'fr' ? 'Entrez le code reçu par e-mail' : 'Enter the code received by email'}
                  </label>
                  <div className="flex-gap-3">
                    <input 
                      type="text" 
                      className="form-input flex-1 text-center font-bold tracking-widest" 
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary" 
                      onClick={handleConfirmUpdate}
                      disabled={verifyUpdateMutation.isPending || otpCode.length < 6}
                    >
                      {verifyUpdateMutation.isPending ? '...' : (language === 'fr' ? 'Confirmer' : 'Confirm')}
                    </button>
                  </div>
                  <button 
                    className="btn-link text-xs text-blue-600 mt-1" 
                    onClick={() => setShowOtpInput(false)}
                  >
                    {language === 'fr' ? '← Retour / Annuler' : '← Back / Cancel'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* HISTORY SECTION */}
          <motion.div className="card" variants={itemVariants}>
            <h3 className="mb-4">{language === 'fr' ? 'Mon historique récent' : 'My recent history'}</h3>
            <div className="flex-col-gap-3">
              {history.length === 0 ? (
                <div className="text-muted text-sm italic">{language === 'fr' ? 'Aucune action récente.' : 'No recent actions.'}</div>
              ) : history.map(t => (
                <motion.div 
                  key={t.id} 
                  className="p-3 border border-slate-100 rounded bg-slate-50 flex justify-between items-center"
                  whileHover={{ x: 5 }}
                >
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
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* DANGER ZONE - ADMIN ONLY */}
        {isAdmin && (
          <motion.div className="card col-span-full card-danger-outline mt-4" variants={itemVariants}>
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
                  disabled={resetMutation.isPending || resetConfirm !== 'PRODUCTION'}
                >
                  {resetMutation.isPending ? '⏳...' : '🧹 Vider les tests'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}
