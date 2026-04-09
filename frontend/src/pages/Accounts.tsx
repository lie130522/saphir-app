import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/formatters';
import type { Account } from '../types';

const EMPTY: Partial<Account> = { nom: '', type: 'caisse', devise: 'USD', solde_initial: 0 };

export default function Accounts() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Account>>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => API.get('/accounts').then(r => setAccounts(r.data));
  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(a: Account) { setForm(a); setEditing(a.id); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    try {
      if (editing) await API.put(`/accounts/${editing}`, form);
      else await API.post('/accounts', form);
      setModal(false); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce compte ?')) return;
    try { await API.delete(`/accounts/${id}`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erreur'); }
  }

  return (
    <Layout title="Comptes" subtitle="Gestion des caisses et comptes bancaires"
      actions={isAdmin ? <button className="btn btn-primary" onClick={openNew}>+ Nouveau compte</button> : undefined}>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Nom du compte</th><th>Type</th><th>Devise</th><th>Solde Initial</th><th>Solde Actuel</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
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
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>🗑️</button>
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
              <div className="modal-title">{editing ? 'Modifier compte' : 'Nouveau compte'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Nom du compte *</label><input title="Nom du compte" className="form-input" required value={form.nom || ''} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Type *</label>
                      <select title="Type de compte" className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                        <option value="caisse">Caisse</option>
                        <option value="banque">Banque</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Devise *</label>
                      <select title="Devise" className="form-select" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value as any })}>
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
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '⏳' : '💾'} Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
