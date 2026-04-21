import React, { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatDate } from '../utils/formatters';
import type { Document } from '../types';

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function Documents() {
  const { isComptable, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents-admin'],
    queryFn: () => API.get('/documents/admin').then(r => r.data)
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => API.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-admin'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erreur lors de l\'upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-admin'] });
    },
    onError: () => alert('Erreur lors de la suppression')
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nom = prompt('Veuillez entrer une description ou un nom pour ce document', file.name);
    if (!nom) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'admin');
    formData.append('nom', nom);
    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Supprimer ce document ?')) return;
    deleteMutation.mutate(id);
  };

  const getFileUrl = (path: string) => {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    return path.startsWith('http') ? path : `${baseUrl}${path}`;
  };

  return (
    <Layout title="Rapports Administratifs" subtitle="Réunions, Correspondances, État, etc."
      actions={
        isComptable ? (
          <div>
            <input type="file" title="Sélectionner un fichier" ref={fileInputRef} className="display-none" onChange={handleFileUpload} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? '⏳ Imploration...' : '+ Importer un rapport / document'}
            </button>
          </div>
        ) : undefined
      }>

      <motion.div 
        className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-slate-100 flex-gap-4 items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Types suggérés :</h3>
          <div className="flex-gap-2">
            <span className="badge badge-secondary">📝 PV de réunion</span>
            <span className="badge badge-secondary">🏛️ Dossiers Étatiques</span>
            <span className="badge badge-secondary">📩 Correspondances reçues</span>
            <span className="badge badge-secondary">📤 Courriers envoyés</span>
          </div>
        </div>
      </motion.div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Référence</th><th>Nom / Description du document</th><th>Aperçu</th><th>Date d'ajout</th><th>Actions</th></tr>
          </thead>
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            {isLoading ? (
              <tr><td colSpan={5} className="text-center p-10">⏳ Chargement des documents...</td></tr>
            ) : documents.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <div className="empty-state-title">Aucun document administratif trouvé</div>
                  </div>
                </td>
              </motion.tr>
            ) : documents.map(doc => (
              <motion.tr key={doc.id} variants={rowVariants} layout>
                <td><span className="badge badge-indigo">{doc.reference || '-'}</span></td>
                <td className="fw-semibold">{doc.nom}</td>
                <td>
                  <span className="text-xs text-muted truncate-200 block">{doc.file_url.split('/').pop()}</span>
                </td>
                <td>{formatDate(doc.created_at)}</td>
                <td>
                  <div className="flex-actions">
                    <a href={getFileUrl(doc.file_url)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ouvrir</a>
                    {isAdmin && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending && deleteMutation.variables === doc.id ? '...' : 'Supprimer'}
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </Layout>
  );
}
