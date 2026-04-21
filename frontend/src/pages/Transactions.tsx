import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 }
};

export default function Transactions() {
  const { isComptable } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [fDateDebut, setFDateDebut] = useState('');
  const [fDateFin, setFDateFin] = useState('');
  const [fType, setFType] = useState('');
  const [fAccountId, setFAccountId] = useState('');

  // Modal form
  const [modal, setModal] = useState(false);
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('justificatif');

  // Queries
  const { data: transactions = [], isLoading: isTransLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', { fDateDebut, fDateFin, fType, fAccountId }],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (fDateDebut) q.append('date_debut', fDateDebut);
      if (fDateFin) q.append('date_fin', fDateFin);
      if (fType) q.append('type', fType);
      if (fAccountId) q.append('account_id', fAccountId);
      const r = await API.get(`/transactions?${q.toString()}`);
      return Array.isArray(r.data) ? r.data : [];
    }
  });

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ['accounts'], queryFn: () => API.get('/accounts').then(r => r.data) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => API.get('/transactions/categories').then(r => r.data) });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => API.get('/projects').then(r => r.data) });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['employees'], queryFn: () => API.get('/employees').then(r => r.data) });
  const { data: transDocs = [], isLoading: isDocsLoading } = useQuery<Document[]>({
    queryKey: ['transaction-docs', docsModal?.id],
    queryFn: () => docsModal ? API.get(`/documents/transaction/${docsModal.id}`).then(r => r.data) : [],
    enabled: !!docsModal
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ payload, note }: { payload: any, note: File | null }) => {
      let res;
      if (editingId) res = await API.put(`/transactions/${editingId}`, payload);
      else res = await API.post('/transactions', payload);
      
      if (note && res.data?.id) {
        const fd = new FormData();
        fd.append('file', note);
        fd.append('type', 'reconnaissance');
        fd.append('transaction_id', res.data.id.toString());
        fd.append('nom', note.name);
        await API.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setModal(false); setEditingId(null); setNoteFile(null);
    },
    onError: (e: any) => {
      alert(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e: any) => {
      alert(e.response?.data?.error || 'Erreur lors de la suppression');
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (fd: FormData) => API.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-docs', docsModal?.id] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-docs', docsModal?.id] });
    }
  });

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = { 
      ...form, 
      montant: parseFloat(form.montant), 
      account_id: parseInt(form.account_id), 
      category_id: form.category_id ? parseInt(form.category_id) : null, 
      project_id: form.project_id ? parseInt(form.project_id) : null, 
      employee_id: form.employee_id ? parseInt(form.employee_id) : null,
      is_remboursable: form.is_remboursable
    };
    saveMutation.mutate({ payload, note: noteFile });
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

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docsModal) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', uploadType);
    fd.append('transaction_id', docsModal.id.toString());
    fd.append('nom', file.name);
    uploadDocMutation.mutate(fd);
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
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            {isTransLoading ? (
              <tr><td colSpan={9} className="text-center p-8">⏳ Chargement...</td></tr>
            ) : transactions.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💸</div>
                    <div className="empty-state-title">Aucune transaction trouvée</div>
                  </div>
                </td>
              </motion.tr>
            ) : transactions.map(t => (
              <motion.tr key={t.id} variants={rowVariants} layout>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setDocsModal(t)} title="Pièces jointes">📎</button>
                      {isComptable && <button className="btn btn-info btn-sm" onClick={() => handleEdit(t)} title="Modifier">✏️</button>}
                      {isComptable && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Supprimer cette transaction ?')) deleteMutation.mutate(t.id); }} title="Supprimer" disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending && deleteMutation.variables === t.id ? '...' : '✖'}
                      </button>}
                    </div>
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
                <div className="modal-title">{editingId ? 'Modifier la transaction' : 'Enregistrer une transaction'}</div>
                <button className="modal-close" onClick={() => { setModal(false); setEditingId(null); }}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="flex-gap-4 mb-4">
                    <label className="flex-center-gap-2 pointer">
                      <input title="Dépense Fonctionnement" type="radio" name="type" checked={form.type === 'sortie' && form.nature === 'fonctionnement'} onChange={() => { handleTypeNatureChange('sortie', 'fonctionnement'); setNoteFile(null); }} /> Dépense Fonctionnement
                    </label>
                    <label className="flex-center-gap-2 pointer">
                      <input title="Dépense Projet" type="radio" name="type" checked={form.type === 'sortie' && form.nature === 'projet'} onChange={() => { handleTypeNatureChange('sortie', 'projet'); setNoteFile(null); }} /> Dépense Projet
                    </label>
                    <label className="flex-center-gap-2 pointer">
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
                          <label htmlFor="is_remboursable" className="form-label mb-0 cursor-pointer">💸 Dépense remboursable (Déboursé)</label>
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

                    {form.type === 'sortie' && !editingId && (
                      <div className="form-group bg-secondary-box">
                        <label className="form-label mb-1">📌 Note de Reconnaissance (Optionnel)</label>
                        <input title="Pièce jointe" type="file" className="form-input bg-white" onChange={e => setNoteFile(e.target.files?.[0] || null)} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setModal(false); setEditingId(null); }}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? '⏳...' : '💾'} {editingId ? 'Mettre à jour' : 'Enregistrer'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {docsModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setDocsModal(null)}
          >
            <motion.div 
              className="modal modal-lg"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="modal-header">
                <div className="modal-title">Pièces jointes : Transaction {docsModal.id}</div>
                <button className="modal-close" onClick={() => setDocsModal(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="bg-secondary-panel mb-4 p-4 rounded">
                  <strong>Détails :</strong> {docsModal.description || docsModal.reference} <br/>
                  <strong>Montant :</strong> {docsModal.type === 'entree' ? '+' : '-'}{formatMoney(docsModal.montant, docsModal.devise)}
                </div>

                {isComptable && (
                  <div className="flex-end-gap-3 mb-4">
                    <div className="form-group mb-0">
                      <select title="Type de document" className="form-select" value={uploadType} onChange={e => setUploadType(e.target.value)}>
                        {docsModal.type === 'sortie' && <option value="reconnaissance">Note de reconnaissance</option>}
                        <option value="justificatif">Justificatif (Facture/Reçu)</option>
                      </select>
                    </div>
                    <input title="Document à uploader" type="file" ref={fileInputRef} className="display-none" onChange={handleDocUpload} />
                    <button className="btn btn-primary h-42" onClick={() => fileInputRef.current?.click()} disabled={uploadDocMutation.isPending}>
                      {uploadDocMutation.isPending ? '⏳...' : '+ Uploader'}
                    </button>
                  </div>
                )}

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Fichier</th><th>Type</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {isDocsLoading ? (
                        <tr><td colSpan={4} className="text-center p-5">⏳ Chargement...</td></tr>
                      ) : transDocs.length === 0 ? (
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
                              {isComptable && <button className="btn btn-danger btn-sm" onClick={() => { if(confirm('Supprimer ?')) deleteDocMutation.mutate(d.id); }} disabled={deleteDocMutation.isPending}>✖</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
