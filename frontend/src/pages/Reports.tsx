import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { formatDate, formatMoney } from '../utils/formatters';
import type { Report, DecodedReport } from '../types';

const tableVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function Reports() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState('rapide');
  const [fDateDebut, setFDateDebut] = useState('');
  const [fDateFin, setFDateFin] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: reports = [], isLoading: historyLoading } = useQuery<Report[]>({
    queryKey: ['reports-history'],
    queryFn: () => API.get('/reports/narrative/history').then(r => r.data)
  });

  const { data: activeReport } = useQuery<DecodedReport>({
    queryKey: ['report', selectedReportId],
    queryFn: async () => {
      const res = await API.get(`/reports/narrative/${selectedReportId}`);
      const contenu = typeof res.data.contenu === 'string' ? JSON.parse(res.data.contenu) : res.data.contenu;
      return { ...res.data, contenu };
    },
    enabled: !!selectedReportId
  });

  const generateMutation = useMutation({
    mutationFn: (data: { type: string; date_debut: string | null; date_fin: string | null }) => API.post('/reports/narrative/generate', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports-history'] });
      setShowModal(false);
      setSelectedReportId(res.data.id);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erreur lors de la génération');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/reports/narrative/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-history'] });
      if (selectedReportId && selectedReportId === deleteMutation.variables) setSelectedReportId(null);
    },
    onError: () => alert('Erreur lors de la suppression')
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      type: formType,
      date_debut: fDateDebut || null,
      date_fin: fDateFin || null
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Supprimer ce rapport de l\'historique ?')) return;
    deleteMutation.mutate(id);
  };

  if (selectedReportId && activeReport) {
    const r = activeReport.contenu;
    const isRapide = r.type === 'rapide';
    
    return (
      <Layout 
        title={r.titre} 
        subtitle={`Généré le ${formatDate(activeReport.created_at)}`}
        actions={
          <div className="flex-gap-3 no-print">
            <button className="btn btn-secondary" onClick={() => setSelectedReportId(null)}>⬅ Retour</button>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer</button>
          </div>
        }
      >
        <motion.div 
          className="card report-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="mb-6 report-text-lg">
            Voici les opérations qui ont été effectuées {r.date_debut && r.date_fin ? `pendant la période du ${formatDate(r.date_debut)} au ${formatDate(r.date_fin)}` : r.date_debut ? `à la date du ${formatDate(r.date_debut)}` : 'depuis le début de l\'activité'}.
          </p>

          <h3 className="report-section-title">1. Réunions Internes & Administration</h3>
          {r.documents && r.documents.length > 0 ? (
            isRapide ? (
              <p className="mb-6">{r.documents.length} document(s) / réunion(s) enregistré(s) durant cette période.</p>
            ) : (
              <div className="mb-6">
                {r.documents.map(doc => (
                  <p key={doc.id} className="mb-1">
                    - {doc.type === 'reunion' ? 'Réunion interne' : 'Document administratif'} du {formatDate(doc.created_at)} : {doc.nom}.
                  </p>
                ))}
              </div>
            )
          ) : (
            <p className="mb-6 text-italic text-muted">Aucune réunion ou document administratif enregistré durant cette période.</p>
          )}

          <h3 className="report-section-title">2. Synthèse du Fonctionnement Interne</h3>
          <p className="mb-3">En ce qui concerne le fonctionnement interne de la structure, voici le résumé financier des opérations :</p>
          
          {isRapide ? (
            <div className="mb-6 mt-4">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Entrées : {r.fonctionnement.entrees.length === 0 ? 'Aucune' : ''}</th>
                    <th>Sorties : {r.fonctionnement.sorties.length === 0 ? 'Aucune' : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {r.fonctionnement.entrees.map(e => <div key={e.devise}>• {formatMoney(e.total, e.devise)}</div>)}
                    </td>
                    <td>
                      {r.fonctionnement.sorties.map(s => <div key={s.devise}>• {formatMoney(s.total, s.devise)}</div>)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mb-6">
              <p className="mb-2"><strong>Entrées :</strong></p>
              {r.fonctionnement.transactions?.filter(t => t.type === 'entree').length === 0 && <p className="mb-3 text-muted">Aucune entrée</p>}
              {r.fonctionnement.transactions?.filter(t => t.type === 'entree').map((t, i) => (
                <p key={i} className="mb-1 pl-4">
                  • {formatMoney(t.montant, t.devise)} – {t.description || t.category_nom} (reçu le {formatDate(t.date)})
                </p>
              ))}

              <p className="mt-4 mb-2"><strong>Sorties :</strong></p>
              {r.fonctionnement.transactions?.filter(t => t.type === 'sortie').length === 0 && <p className="mb-3 text-muted">Aucune sortie</p>}
              {r.fonctionnement.transactions?.filter(t => t.type === 'sortie').map((t, i) => (
                <p key={i} className="mb-1 pl-4">
                  • {formatMoney(t.montant, t.devise)} – {t.description || t.category_nom} (payé le {formatDate(t.date)})
                </p>
              ))}
            </div>
          )}

          <h3 className="report-section-title">3. État des Projets</h3>
          {r.projets && r.projets.length > 0 ? (
            isRapide ? (
               <p className="mb-6">Aucun mouvement détaillé lié aux projets ne s'affiche dans cette vue rapide (voir vue détaillée).</p>
            ) : (
              <div className="mb-6">
                {r.projets.map(p => {
                  const ratio = p.budget_usd > 0 ? (p.total_depense / p.budget_usd) * 100 : 0;
                  return (
                    <div key={p.id} className="mb-3">
                      <p className="mb-1">
                        - Projet « {p.nom} » : avancement à {ratio.toFixed(0)} %
                        {p.transactions && p.transactions.length > 0 
                          ? ' – ' + p.transactions.map(t => `${t.description || t.category_nom} enregistré(e) le ${formatDate(t.date)}`).join(', ') + '.'
                          : ' – aucun mouvement financier récent enregistré.'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <p className="mb-6 text-italic text-muted">Aucun mouvement lié aux projets durant cette période.</p>
          )}

          <div className="report-signature mt-8">
            <p className="mb-1"><strong>Approuvé par la direction</strong></p>
            <p className="text-xs text-muted">Document généré depuis Saphir Group</p>
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Rapports d'Activité" 
      subtitle="Historique des rapports générés"
      actions={<button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Générer Rapport</button>}
    >
      <div className="card">
        <h3 className="mb-4">Historique des rapports</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date de création</th>
                <th>Titre / Période</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <motion.tbody
              variants={tableVariants}
              initial="hidden"
              animate="visible"
            >
              {historyLoading ? (
                <tr><td colSpan={4} className="text-center p-10">⏳ Chargement de l'historique...</td></tr>
              ) : reports.length === 0 ? (
                <motion.tr variants={rowVariants}>
                  <td colSpan={4} className="text-center p-10 text-muted">Aucun rapport généré pour le moment. Cliquez sur "Générer Rapport" pour commencer.</td>
                </motion.tr>
              ) : reports.map(r => (
                <motion.tr key={r.id} variants={rowVariants} layout>
                  <td className="w-[200px]">{new Date(r.created_at).toLocaleString()}</td>
                  <td><strong>{r.titre}</strong></td>
                  <td>
                    <span className={`badge ${r.type === 'detaille' ? 'badge-purple' : 'badge-info'}`}>
                      {r.type === 'detaille' ? 'Détaillé' : 'Rapide'}
                    </span>
                  </td>
                  <td className="w-[150px]">
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReportId(r.id)}>Ouvrir</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending && deleteMutation.variables === r.id ? '...' : '✖'}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="modal-header">
                <div className="modal-title">Générer un Rapport Narratif</div>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleGenerate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Type de Rapport</label>
                    <select title="Type de rapport" className="form-select" value={formType} onChange={e => setFormType(e.target.value)}>
                      <option value="rapide">Rapport Rapide (Synthèse globale)</option>
                      <option value="detaille">Rapport Détaillé (Avec tous les projets)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de début (Optionnel)</label>
                    <input title="Date de début" type="date" className="form-input" value={fDateDebut} onChange={e => setFDateDebut(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de fin (Optionnel)</label>
                    <input title="Date de fin" type="date" className="form-input" value={fDateFin} onChange={e => setFDateFin(e.target.value)} />
                  </div>
                  <p className="text-sm text-muted">Laissez les dates vides pour englober toutes les opérations depuis le début.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={generateMutation.isPending}>{generateMutation.isPending ? 'Génération...' : '📃 Valider / Générer'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
