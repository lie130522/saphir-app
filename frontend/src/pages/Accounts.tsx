import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatMoney } from '../utils/formatters';
import type { Account } from '../types';

const EMPTY: Partial<Account> = { nom: '', type: 'caisse', devise: 'USD', solde_initial: 0 };

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function Accounts() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Account>>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => API.get('/accounts').then(r => r.data)
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Account>) => {
      if (editing) return API.put(`/accounts/${editing}`, data);
      return API.post('/accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setModal(false);
    },
    onError: (e: AxiosError<{error: string}>) => {
      alert(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e: AxiosError<{error: string}>) => {
      alert(e.response?.data?.error || 'Erreur lors de la suppression');
    }
  });

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(a: Account) { setForm(a); setEditing(a.id); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    saveMutation.mutate(form);
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce compte ?')) return;
    deleteMutation.mutate(id);
  }

  return (
    <Layout title="Comptes" subtitle="Gestion des caisses et comptes bancaires"
      actions={isAdmin ? <button className="btn btn-primary" onClick={openNew}>+ Nouveau compte</button> : undefined}>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Nom du compte</th><th>Type</th><th>Devise</th><th>Solde Initial</th><th>Solde Actuel</th><th>Actions</th></tr>
          </thead>
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            {isLoading ? (
              <tr><td colSpan={6} className="text-center p-8">⏳ Chargement...</td></tr>
            ) : accounts.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={6} className="text-center p-8">Aucun compte trouvé</td>
              </motion.tr>
            ) : accounts.map(a => (
              <motion.tr key={a.id} variants={rowVariants} layout>
                <td className="fw-semibold">{a.nom}</td>
                <td>{a.type === 'caisse' ? '💼 Caisse' : '🏦 Banque'}</td>
                <td><span className={a.devise === 'USD' ? 'badge badge-success' : 'badge badge-info'}>{a.devise}</span></td>
                <td>{formatMoney(a.solde_initial, a.devise)}</td>
                <td className={`fw-bold ${a.solde_actuel >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatMoney(a.solde_actuel, a.devise)}
                </td>
                <td>
                  {isAdmin && (
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending && deleteMutation.variables === a.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setModal(false)}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="modal-header">
                <div className="modal-title">{editing ? 'Modifier compte' : 'Nouveau compte'}</div>
                <button className="modal-close" onClick={() => setModal(false)}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Nom du compte *</label><input title="Nom du compte" className="form-input" required value={form.nom || ''} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Type *</label>
                        <select title="Type de compte" className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'caisse' | 'banque' })}>
                          <option value="caisse">Caisse</option>
                          <option value="banque">Banque</option>
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label">Devise *</label>
                        <select title="Devise" className="form-select" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value as 'USD' | 'CDF' })}>
                          <option value="USD">USD</option>
                          <option value="CDF">CDF</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group"><label className="form-label">Solde Initial</label><input title="Solde initial" className="form-input" type="number" step="0.01" value={form.solde_initial || 0} onChange={e => setForm({ ...form, solde_initial: parseFloat(e.target.value) })} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? '⏳' : '💾'} Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
