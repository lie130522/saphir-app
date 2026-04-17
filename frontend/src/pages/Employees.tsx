import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import type { Employee } from '../types';
import { formatDate } from '../utils/formatters';

const EMPTY: Partial<Employee> = { nom: '', prenom: '', poste: '', telephone: '', email: '', date_embauche: '' };

export default function Employees() {
  const { isComptable } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => API.get('/employees').then(r => setEmployees(r.data));
  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(e: Employee) { setForm(e); setEditing(e.id); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    try {
      if (editing) await API.put(`/employees/${editing}`, form);
      else await API.post('/employees', form);
      setModal(false);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur'); 
    }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet employé ?')) return;
    await API.delete(`/employees/${id}`);
    load();
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
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">Aucun employé trouvé</div></div></td></tr>
            ) : filtered.map(e => (
              <tr key={e.id}>
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
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
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
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '⏳' : '💾'} Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
