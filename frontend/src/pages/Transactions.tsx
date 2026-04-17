import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatMoney, formatDate, today } from '../utils/formatters';
import type { Transaction, Account, Category, Project, Employee, Document } from '../types';

interface TransactionForm {
  date: string;
  type: 'entree' | 'sortie';
  montant: string;
  devise: 'USD' | 'CDF';
  account_id: string;
  category_id: string;
  nature: 'fonctionnement' | 'projet';
  project_id: string;
  employee_id: string;
  description: string;
  reference: string;
  is_remboursable: boolean;
}

export default function Transactions() {
  const { isComptable } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters
  const [fDateDebut, setFDateDebut] = useState('');
  const [fDateFin, setFDateFin] = useState('');
  const [fType, setFType] = useState('');
  const [fAccountId, setFAccountId] = useState('');

  // Modal form
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const EMPTY: TransactionForm = { 
    date: today(), 
    type: 'sortie', 
    montant: '', 
    devise: 'USD', 
    account_id: '', 
    category_id: '', 
    nature: 'fonctionnement', 
    project_id: '', 
    employee_id: '', 
    description: '', 
    reference: '',
    is_remboursable: false
  };
  const [form, setForm] = useState<TransactionForm>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);

  // Docs modal
  const [docsModal, setDocsModal] = useState<Transaction | null>(null);
  const [transDocs, setTransDocs] = useState<Document[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('justificatif');

  const loadData = useCallback(() => {
    const q = new URLSearchParams();
    if (fDateDebut) q.append('date_debut', fDateDebut);
    if (fDateFin) q.append('date_fin', fDateFin);
    if (fType) q.append('type', fType);
    if (fAccountId) q.append('account_id', fAccountId);
    API.get(`/transactions?${q.toString()}`).then(r => {
      const data = r.data;
      setTransactions(Array.isArray(data) ? data : []);
    });
  }, [fDateDebut, fDateFin, fType, fAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    API.get('/accounts').then(r => setAccounts(r.data));
    API.get('/transactions/categories').then(r => setCategories(r.data));
    API.get('/projects').then(r => setProjects(r.data));
    API.get('/employees').then(r => setEmployees(r.data));
  }, []);

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    try {
      let res;
      const payload = { 
        ...form, 
        montant: parseFloat(form.montant), 
        account_id: parseInt(form.account_id), 
        category_id: form.category_id ? parseInt(form.category_id) : null, 
        project_id: form.project_id ? parseInt(form.project_id) : null, 
        employee_id: form.employee_id ? parseInt(form.employee_id) : null,
        is_remboursable: form.is_remboursable
      };
      console.log('TRANS PAYLOAD:', payload);
      if (editingId) {
        res = await API.put(`/transactions/${editingId}`, payload);
      } else {
        res = await API.post('/transactions', payload);
      }
      
      if (noteFile && res.data?.id) {
        const formData = new FormData();
        formData.append('file', noteFile);
        formData.append('type', 'reconnaissance');
        formData.append('transaction_id', res.data.id.toString());
        formData.append('nom', noteFile.name);
        await API.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setModal(false); setEditingId(null); setNoteFile(null); loadData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur');
    }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer ou annuler cette transaction ? L\'action est irréversible.')) return;
    try { 
      await API.delete(`/transactions/${id}`); 
      loadData(); 
    } catch (e: unknown) {
      console.error('Delete error:', e);
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur lors de la suppression. Veuillez vérifier vos droits.');
    }
  }

  function handleEdit(t: Transaction) {
    setForm({
      date: t.date.split('T')[0],
      type: t.type,
      montant: t.montant.toString(),
      devise: t.devise,
      account_id: t.account_id.toString(),
      category_id: t.category_id?.toString() || '',
      nature: t.nature,
      project_id: t.project_id?.toString() || '',
      employee_id: t.employee_id?.toString() || '',
      description: t.description || '',
      reference: t.reference || '',
      is_remboursable: !!t.is_remboursable
    });
    setEditingId(t.id);
    setModal(true);
  }

  function handleTypeNatureChange(type: 'entree' | 'sortie', nature: 'fonctionnement' | 'projet') {
    setForm({ ...form, type, nature, category_id: '', project_id: nature === 'fonctionnement' ? '' : form.project_id });
  }

  const filteredCategories = categories.filter(c => c.type === form.type && (c.nature === form.nature || c.nature === 'general'));
  const activeProjects = projects.filter(p => p.statut === 'actif');

  function openDocs(t: Transaction) {
    setDocsModal(t);
    API.get(`/documents/transaction/${t.id}`).then(r => setTransDocs(r.data));
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docsModal) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);
    formData.append('transaction_id', docsModal.id.toString());
    formData.append('nom', file.name);

    try {
      await API.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      API.get(`/documents/transaction/${docsModal.id}`).then(r => setTransDocs(r.data));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDocDelete(id: number) {
    if(!confirm('Supprimer ce document ?')) return;
    try {
      await API.delete(`/documents/${id}`);
      setTransDocs(transDocs.filter(d => d.id !== id));
    } catch { alert('Erreur'); }
  }

  return (
    <Layout title="Transactions" subtitle="Historique des mouvements de trésorerie"
      actions={isComptable ? <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditingId(null); setModal(true); }}>+ Nouvelle Transaction</button> : undefined}>

      <div className="filter-bar">
        <div className="form-group w-36"><label className="form-label">Type</label>
          <select title="Type de transaction" className="form-select" value={fType} onChange={e => setFType(e.target.value)}>
            <option value="">Tous</option><option value="entree">Entrées</option><option value="sortie">Sorties</option>
          </select>
        </div>
        <div className="form-group w-36"><label className="form-label">Du (Date)</label><input title="Date de début" type="date" className="form-input" value={fDateDebut} onChange={e => setFDateDebut(e.target.value)} /></div>
        <div className="form-group w-36"><label className="form-label">Au (Date)</label><input title="Date de fin" type="date" className="form-input" value={fDateFin} onChange={e => setFDateFin(e.target.value)} /></div>
        <div className="form-group flex-1 min-w-40"><label className="form-label">Compte</label>
          <select title="Compte" className="form-select" value={fAccountId} onChange={e => setFAccountId(e.target.value)}>
            <option value="">Tous les comptes</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.devise})</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Sens</th><th>Compte</th><th>Catégorie</th><th>Projet / Nature</th><th>Employé</th><th>Montant</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">💸</div><div className="empty-state-title">Aucune transaction trouvée</div></div></td></tr>
            ) : transactions.map(t => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td className="truncate-200">
                  {t.description || '-'}
                  {t.reference && <div className="text-xs text-muted">Réf: {t.reference}</div>}
                </td>
                <td><span className={t.type === 'entree' ? 'badge badge-success' : 'badge badge-danger'}>{t.type === 'entree' ? 'Entrée' : 'Sortie'}</span></td>
                <td>{t.account_nom}</td>
                <td>{t.category_nom || '-'}</td>
                <td>
                  <div className="flex-col gap-1">
                    {t.nature === 'projet' ? (
                      <span className="badge badge-purple" title={t.project_nom}>
                        {t.project_nom ? (t.project_nom.length > 20 ? t.project_nom.substring(0, 20) + '...' : t.project_nom) : 'Projet inconnu'}
                      </span>
                    ) : (
                      <span className="badge badge-secondary">Fonctionnement</span>
                    )}
                    {!!t.is_remboursable && <span className="badge badge-warning text-xs">💸 Remboursable</span>}
                  </div>
                </td>
                <td>{t.emp_nom ? `${t.emp_prenom} ${t.emp_nom}` : '-'}</td>
                <td className={t.type === 'entree' ? 'amount-positive' : 'amount-negative'}>
                  {t.type === 'entree' ? '+' : '-'}{formatMoney(t.montant, t.devise)}
                </td>
                <td>
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openDocs(t)} title="Pièces jointes">📎</button>
                      {isComptable && <button className="btn btn-info btn-sm" onClick={() => handleEdit(t)} title="Modifier">✏️</button>}
                      {isComptable && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)} title="Supprimer">✖</button>}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editingId ? 'Modifier la transaction' : 'Enregistrer une transaction'}</div>
              <button className="modal-close" onClick={() => { setModal(false); setEditingId(null); }}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="flex-gap-4 mb-4">
                  <label className="flex-center-gap-2">
                    <input title="Dépense Fonctionnement" type="radio" name="type" checked={form.type === 'sortie' && form.nature === 'fonctionnement'} onChange={() => { handleTypeNatureChange('sortie', 'fonctionnement'); setNoteFile(null); }} /> Dépense Fonctionnement
                  </label>
                  <label className="flex-center-gap-2">
                    <input title="Dépense Projet" type="radio" name="type" checked={form.type === 'sortie' && form.nature === 'projet'} onChange={() => { handleTypeNatureChange('sortie', 'projet'); setNoteFile(null); }} /> Dépense Projet
                  </label>
                  <label className="flex-center-gap-2">
                    <input title="Entrée ou Encaissement" type="radio" name="type" checked={form.type === 'entree'} onChange={() => { handleTypeNatureChange('entree', 'fonctionnement'); setNoteFile(null); }} /> Entrée (Encaissement)
                  </label>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group"><label className="form-label">Date *</label><input title="Date" className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Compte Caisse/Banque *</label>
                    <select title="Compte Caisse ou Banque" className="form-select" required value={form.account_id} onChange={e => {
                      const acc = accounts.find(a => a.id === parseInt(e.target.value));
                      setForm({ ...form, account_id: e.target.value, devise: acc ? acc.devise : form.devise });
                    }}>
                      <option value="">-- Sélectionner un compte --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.devise}) - Solde: {a.solde_actuel}</option>)}
                    </select>
                  </div>

                  <div className="form-group"><label className="form-label">Montant ({form.devise}) *</label><input title="Montant" className="form-input" type="number" step="0.01" min="0.01" required value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} /></div>
                  
                  <div className="form-group"><label className="form-label">Catégorie</label>
                    <select title="Catégorie" className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">-- Ignorer --</option>
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>

                  {form.nature === 'projet' && (
                    <>
                      <div className="form-group"><label className="form-label">Projet lié *</label>
                        <select title="Projet lié" className="form-select" required value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                          <option value="">-- Sélectionner un projet --</option>
                          {activeProjects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </select>
                      </div>
                      <div className="form-group flex-center-gap-2 pointer mt-2">
                        <input type="checkbox" id="is_remboursable" checked={form.is_remboursable} onChange={e => setForm({ ...form, is_remboursable: e.target.checked })} />
                        <label htmlFor="is_remboursable" className="form-label mb-0 cursor-pointer">💸 Dépense remboursable par le client (Déboursé)</label>
                      </div>
                    </>
                  )}

                  <div className="form-group"><label className="form-label">Employé / Responsable</label>
                    <select title="Employé ou responsable" className="form-select" required={form.type === 'sortie'} value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                      <option value="">-- Aucun --</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom} ({e.poste})</option>)}
                    </select>
                  </div>

                  <div className="form-group col-span-full"><label className="form-label">Description / Motif</label>
                    <textarea title="Description" className="form-textarea" rows={2} required={form.type === 'sortie'} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  
                  <div className="form-group col-span-full"><label className="form-label">Référence (N° Facture, Reçu, etc.)</label>
                    <input title="Référence" className="form-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                  </div>

                  {form.type === 'sortie' && (
                    <div className="form-group bg-secondary-box">
                      <label className="form-label mb-1">📌 Attacher directement une Note de Reconnaissance (Optionnel)</label>
                      <input title="Pièce jointe" type="file" className="form-input bg-white" onChange={e => setNoteFile(e.target.files?.[0] || null)} />
                      <div className="text-sm-muted">Vous pourrez également l'attacher ou ajouter une pièce justificative (facture finale) plus tard.</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(false); setEditingId(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '⏳...' : '💾'} {editingId ? 'Mettre à jour' : 'Enregistrer'} transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PIECES JOINTES */}
      {docsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDocsModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Pièces jointes : Transaction {docsModal.id}</div>
              <button className="modal-close" onClick={() => setDocsModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="bg-secondary-panel">
                <strong>Détails :</strong> {docsModal.description || docsModal.reference} <br/>
                <strong>Montant :</strong> {docsModal.type === 'entree' ? '+' : '-'}{formatMoney(docsModal.montant, docsModal.devise)} <br/>
                <strong>Responsable :</strong> {docsModal.emp_nom ? `${docsModal.emp_prenom} ${docsModal.emp_nom}` : 'Non spécifié'}
              </div>

              {isComptable && (
                <div className="flex-end-gap-3">
                  <div className="form-group mb-0">
                    <label className="form-label">Type de document</label>
                    <select title="Type de document" className="form-select" value={uploadType} onChange={e => setUploadType(e.target.value)}>
                      {docsModal.type === 'sortie' && <option value="reconnaissance">Note de reconnaissance (Dette)</option>}
                      <option value="justificatif">Pièce justificative (Facture/Reçu)</option>
                    </select>
                  </div>
                  <input title="Document à uploader" type="file" ref={fileInputRef} className="display-none" onChange={handleDocUpload} />
                  <button className="btn btn-primary h-42" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    {loading ? '⏳...' : '+ Uploader document'}
                  </button>
                </div>
              )}

              <table className="data-table">
                <thead>
                  <tr><th>Nom du fichier</th><th>Type</th><th>Date d'ajout</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {transDocs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center p-5">Aucune pièce jointe.</td></tr>
                  ) : transDocs.map(d => (
                    <tr key={d.id}>
                      <td className="fw-semibold">{d.nom}</td>
                      <td>
                        <span className={`badge ${d.type === 'reconnaissance' ? 'badge-danger' : 'badge-info'}`}>
                          {d.type === 'reconnaissance' ? 'Note de reco.' : 'Justificatif'}
                        </span>
                      </td>
                      <td>{formatDate(d.created_at)}</td>
                      <td>
                        <div className="flex-actions">
                          <a href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${d.file_url}` : d.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ouvrir</a>
                          {isComptable && <button className="btn btn-danger btn-sm" onClick={() => handleDocDelete(d.id)}>✖</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
