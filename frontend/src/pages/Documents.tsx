import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatDate } from '../utils/formatters';
import type { Document } from '../types';

export default function Documents() {
  const { isComptable, isAdmin } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => API.get('/documents/admin').then(r => setDocuments(r.data));
  useEffect(() => { load(); }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nom = prompt('Veuillez entrer une description ou un nom pour ce document', file.name);
    if (!nom) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'admin');
    formData.append('nom', nom);

    try {
      await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await API.delete(`/documents/${id}`);
      load();
    } catch {
      alert('Erreur lors de la suppression');
    }
  }

  return (
    <Layout title="Rapports Administratifs" subtitle="Réunions, Correspondances, État, etc."
      actions={
        isComptable ? (
          <div>
            <input type="file" title="Sélectionner un fichier" ref={fileInputRef} className="display-none" onChange={handleFileUpload} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              {loading ? '⏳' : '+'} Importer un rapport / document
            </button>
          </div>
        ) : undefined
      }>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-slate-100 flex-gap-4 items-center">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Types suggérés :</h3>
          <div className="flex-gap-2">
            <span className="badge badge-secondary">📝 PV de réunion</span>
            <span className="badge badge-secondary">🏛️ Dossiers Étatiques</span>
            <span className="badge badge-secondary">📩 Correspondances reçues</span>
            <span className="badge badge-secondary">📤 Courriers envoyés</span>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Référence</th><th>Nom / Description du document</th><th>Aperçu</th><th>Date d'ajout</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">Aucun document administratif trouvé</div></div></td></tr>
            ) : documents.map(doc => (
              <tr key={doc.id}>
                <td><span className="badge badge-indigo">{doc.reference || '-'}</span></td>
                <td className="fw-semibold">
                   {doc.nom}
                </td>
                <td>
                  <span className="text-xs text-muted truncate-200 block">{doc.file_url.split('/').pop()}</span>
                </td>
                <td>{formatDate(doc.created_at)}</td>
                <td>
                  <div className="flex-actions">
                    <a href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${doc.file_url}` : doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ouvrir</a>
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.id)}>Supprimer</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
