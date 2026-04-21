import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import type { Project } from '../types';
import { formatDate, formatMoney } from '../utils/formatters';

const STATUT_LABELS: Record<string, string> = { actif: 'Actif', termine: 'Terminé', en_pause: 'En pause' };
const STATUT_CLASS: Record<string, string> = { actif: 'badge-success', termine: 'badge-info', en_pause: 'badge-warning' };
const TYPE_GESTION_LABELS: Record<string, string> = { plein_pouvoir: 'Plein pouvoir', partiel: 'Partiel', main_oeuvre: 'M.O. uniquement' };
const EMPTY: Partial<Project> = { nom: '', client: '', budget_usd: 0, budget_cdf: 0, statut: 'actif', date_debut: '', date_fin: '', description: '', type_gestion: 'plein_pouvoir' };

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function Projects() {
  const { isComptable, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Project>>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const r = await API.get('/projects');
      return r.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      if (editing) return API.put(`/projects/${editing}`, data);
      return API.post('/projects', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModal(false);
    },
    onError: (e: any) => {
      alert(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      alert('Erreur lors de la suppression');
    }
  });

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(p: Project) { setForm(p); setEditing(p.id); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    saveMutation.mutate(form);
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce projet ?')) return;
    deleteMutation.mutate(id);
  }

  const filtered = projects.filter(p =>
    (!filter || p.statut === filter)
  );

  return (
    <Layout title="Projets" subtitle={`${projects.length} projet(s) enregistré(s)`}
      actions={isComptable ? <button className="btn btn-primary" onClick={openNew}>+ Nouveau projet</button> : undefined}>

      <div className="flex-gap-2 mb-4">
        {['', 'actif', 'termine', 'en_pause'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s === '' ? 'Tous' : STATUT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Nom du projet</th><th>Client</th><th>Gestion</th><th>Budget USD</th><th>Budget CDF</th><th>Statut</th><th>Début</th><th>Fin prévue</th><th>Actions</th></tr>
          </thead>
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            {isLoading ? (
              <tr><td colSpan={9} className="text-center p-8">⏳ Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-title">Aucun projet</div>
                  </div>
                </td>
              </motion.tr>
            ) : filtered.map(p => (
              <motion.tr key={p.id} variants={rowVariants} layout>
                <td className="fw-semibold">{p.nom}</td>
                <td>{p.client || '-'}</td>
                <td><span className="badge badge-purple">{TYPE_GESTION_LABELS[p.type_gestion]}</span></td>
                <td className="amount-positive">{formatMoney(p.budget_usd, 'USD')}</td>
                <td className="text-cyan">{formatMoney(p.budget_cdf, 'CDF')}</td>
                <td><span className={`badge ${STATUT_CLASS[p.statut]}`}>{STATUT_LABELS[p.statut]}</span></td>
                <td>{p.date_debut ? formatDate(p.date_debut) : '-'}</td>
                <td>{p.date_fin ? formatDate(p.date_fin) : '-'}</td>
                <td>
                  {isComptable && (
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️</button>
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending}>
                          {deleteMutation.isPending && deleteMutation.variables === p.id ? '...' : '🗑️'}
                        </button>
                      )}
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
              className="modal modal-lg"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="modal-header">
                <div className="modal-title">{editing ? 'Modifier projet' : 'Nouveau projet'}</div>
                <button className="modal-close" onClick={() => setModal(false)}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-grid form-grid-2">
                    <div className="form-group col-span-full"><label className="form-label">Nom du projet *</label><input title="Nom du projet" className="form-input" required value={form.nom || ''} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Client</label><input title="Client" className="form-input" value={form.client || ''} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Statut</label>
                      <select title="Statut" className="form-select" value={form.statut || 'actif'} onChange={e => setForm({ ...form, statut: e.target.value as Project['statut'] })}>
                        <option value="actif">Actif</option>
                        <option value="termine">Terminé</option>
                        <option value="en_pause">En pause</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Type de Gestion *</label>
                      <select title="Type de gestion" className="form-select" value={form.type_gestion || 'plein_pouvoir'} onChange={e => setForm({ ...form, type_gestion: e.target.value as Project['type_gestion'] })}>
                        <option value="plein_pouvoir">Plein pouvoir (Gestion totale)</option>
                        <option value="partiel">Partiel (Co-gestion)</option>
                        <option value="main_oeuvre">Main d'œuvre uniquement</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Budget USD</label><input title="Budget USD" className="form-input" type="number" min="0" step="0.01" value={form.budget_usd || 0} onChange={e => setForm({ ...form, budget_usd: parseFloat(e.target.value) })} /></div>
                    <div className="form-group"><label className="form-label">Budget CDF</label><input title="Budget CDF" className="form-input" type="number" min="0" step="1" value={form.budget_cdf || 0} onChange={e => setForm({ ...form, budget_cdf: parseFloat(e.target.value) })} /></div>
                    <div className="form-group"><label className="form-label">Date de début</label><input title="Date de début" className="form-input" type="date" value={form.date_debut || ''} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Date de fin prévue</label><input title="Date de fin" className="form-input" type="date" value={form.date_fin || ''} onChange={e => setForm({ ...form, date_fin: e.target.value })} /></div>
                    <div className="form-group col-span-full"><label className="form-label">Description</label><textarea title="Description" className="form-textarea" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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
