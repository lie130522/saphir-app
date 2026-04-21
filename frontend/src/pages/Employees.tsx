import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import type { Employee } from '../types';
import { formatDate } from '../utils/formatters';
import { TableRowSkeleton } from '../components/Skeleton';

const EMPTY: Partial<Employee> = { nom: '', prenom: '', poste: '', telephone: '', email: '', date_embauche: '' };

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function Employees() {
  const { isComptable } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const r = await API.get('/employees');
      return r.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      if (editing) return API.put(`/employees/${editing}`, data);
      return API.post('/employees', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setModal(false);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(e: Employee) { setForm(e); setEditing(e.id); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    saveMutation.mutate(form);
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet employé ?')) return;
    deleteMutation.mutate(id);
  }

  const filtered = employees.filter(e =>
    `${e.nom} ${e.prenom} ${e.poste}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Employés" subtitle={`${employees.length} employé(s) enregistré(s)`}
      actions={isComptable ? <button className="btn btn-primary" onClick={openNew}>+ Ajouter</button> : undefined}>

      <div className="mb-4">
        <input title="Rechercher" className="form-input max-w-sm" placeholder="🔍 Rechercher un employé..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Nom</th><th>Prénom</th><th>Poste</th><th>Téléphone</th><th>Email</th><th>Date d'embauche</th><th>Actions</th></tr>
          </thead>
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : filtered.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">Aucun employé trouvé</div>
                  </div>
                </td>
              </motion.tr>
            ) : filtered.map(e => (
              <motion.tr key={e.id} variants={rowVariants} layout>
                <td className="fw-semibold">{e.nom}</td>
                <td>{e.prenom}</td>
                <td><span className="badge badge-info">{e.poste}</span></td>
                <td>{e.telephone || '-'}</td>
                <td>{e.email || '-'}</td>
                <td>{e.date_embauche ? formatDate(e.date_embauche) : '-'}</td>
                <td>
                  {isComptable && (
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending && deleteMutation.variables === e.id ? '...' : '🗑️'}
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
                <div className="modal-title">{editing ? 'Modifier employé' : 'Nouvel employé'}</div>
                <button className="modal-close" onClick={() => setModal(false)}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-grid form-grid-2">
                    <div className="form-group"><label className="form-label">Nom *</label><input title="Nom" className="form-input" required value={form.nom || ''} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Prénom *</label><input title="Prénom" className="form-input" required value={form.prenom || ''} onChange={e => setForm({ ...form, prenom: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Poste *</label><input title="Poste" className="form-input" required value={form.poste || ''} onChange={e => setForm({ ...form, poste: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label><input title="Téléphone" className="form-input" value={form.telephone || ''} onChange={e => setForm({ ...form, telephone: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input title="Email" className="form-input" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Date d'embauche</label><input title="Date d'embauche" className="form-input" type="date" value={form.date_embauche || ''} onChange={e => setForm({ ...form, date_embauche: e.target.value })} /></div>
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
