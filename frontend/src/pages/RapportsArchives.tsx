import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import translations from '../i18n/translations';
import { useSettings } from '../contexts/useSettings';
import toast, { Toaster } from 'react-hot-toast';

interface ArchiveMonth {
  month_year: string;
  tx_count: number;
  imported_at: string;
}

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function RapportsArchives() {
  const { language } = useSettings();
  const queryClient = useQueryClient();
  const t = translations[language as keyof typeof translations] as Record<string, string>;
  const [file, setFile] = useState<File | null>(null);

  const { data: months = [], isLoading } = useQuery<ArchiveMonth[]>({
    queryKey: ['archive-months'],
    queryFn: () => API.get('/archives/months').then(r => r.data)
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: () => API.get('/archives/template', { responseType: 'blob' }),
    onSuccess: (response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'saphir_modele_import.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onError: () => toast.error('Erreur lors du téléchargement')
  });

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => API.post('/archives/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Import réussi');
      setFile(null);
      const input = document.getElementById('excelUpload') as HTMLInputElement;
      if (input) input.value = '';
      queryClient.invalidateQueries({ queryKey: ['archive-months'] });
    },
    onError: (err: AxiosError<{error: string}>) => {
      toast.error(err.response?.data?.error || "Erreur lors de l'importation");
    }
  });

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    importMutation.mutate(formData);
  };

  return (
    <Layout title={t.archives} subtitle="Consolidation de l'historique et import d'anciens rapports">
      <Toaster position="top-right" />
      
      <motion.div 
        className="archives-header" 
        style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card" style={{ flex: 1, padding: '20px' }}>
          <h3>Importer un historique (Excel)</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Veuillez utiliser strictement le modèle fourni pour importer vos anciennes données.
          </p>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => downloadTemplateMutation.mutate()}
              disabled={downloadTemplateMutation.isPending}
            >
              📥 {downloadTemplateMutation.isPending ? 'Téléchargement...' : 'Télécharger le Modèle'}
            </button>
            <input 
              type="file" 
              id="excelUpload" 
              accept=".xlsx, .xls" 
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleUpload}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? 'Import...' : 'Importer'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="archives-list">
        <h3 className="mb-4">Historique des mois consolidés</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Nombre d'opérations</th>
                <th>Date d'import</th>
              </tr>
            </thead>
            <motion.tbody
              variants={tableVariants}
              initial="hidden"
              animate="visible"
            >
              {isLoading ? (
                <tr><td colSpan={3} className="text-center p-10">⏳ Chargement des archives...</td></tr>
              ) : months.length === 0 ? (
                <motion.tr variants={rowVariants}>
                  <td colSpan={3} className="p-4">Aucun historique importé pour le moment.</td>
                </motion.tr>
              ) : months.map((m) => (
                <motion.tr key={m.month_year} variants={rowVariants} layout>
                  <td><strong>{m.month_year}</strong></td>
                  <td>{m.tx_count}</td>
                  <td>{new Date(m.imported_at).toLocaleString('fr-FR')}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
