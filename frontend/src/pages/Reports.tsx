import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { formatDate, formatMoney } from '../utils/formatters';

import type { Report, DecodedReport } from '../types';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal Generer
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState('rapide');
  const [fDateDebut, setFDateDebut] = useState('');
  const [fDateFin, setFDateFin] = useState('');

  // Selected Report View
  const [selectedReport, setSelectedReport] = useState<DecodedReport | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  function loadHistory() {
    API.get('/reports/narrative/history').then(r => setReports(r.data));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/reports/narrative/generate', {
        type: formType,
        date_debut: fDateDebut || null,
        date_fin: fDateFin || null
      });
      setShowModal(false);
      loadHistory();
      handleViewReport(res.data.id);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      alert(errorResponse.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewReport(id: number) {
    try {
      const res = await API.get(`/reports/narrative/${id}`);
      const data = { ...res.data, contenu: JSON.parse(res.data.contenu) };
      setSelectedReport(data);
    } catch {
      alert('Erreur lors du chargement du rapport');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce rapport de l\'historique ?')) return;
    try {
      await API.delete(`/reports/narrative/${id}`);
      loadHistory();
      if (selectedReport && selectedReport.id === id) setSelectedReport(null);
    } catch {
      alert('Erreur');
    }
  }

  if (selectedReport) {
    const r = selectedReport.contenu;
    return (
      <Layout 
        title={r.titre} 
        subtitle={`Généré le ${formatDate(selectedReport.created_at)}`}
        actions={
          <div className="flex-gap-3 no-print">
            <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>⬅ Retour</button>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer</button>
          </div>
        }
      >
        <div className="card report-container">
          {/* INTRODUCTION */}
          <p className="mb-6 report-text-lg">
            Voici les opérations qui ont été effectuées {r.date_debut && r.date_fin ? `pendant la période du ${formatDate(r.date_debut)} au ${formatDate(r.date_fin)}` : r.date_debut ? `à la date du ${formatDate(r.date_debut)}` : 'depuis le début de l\'activité'}.
          </p>

          {/* REUNIONS INTERNES */}
          <h3 className="report-section-title">1. Réunions Internes & Administration</h3>
          {r.documents && r.documents.length > 0 ? (
            <>
              <p className="mb-3">Pendant la période, nous avons enregistré {r.documents.length} document(s) / réunion(s) interne(s) :</p>
              <ul className="report-list">
                {r.documents.map((doc) => (
                  <li key={doc.id} className="mb-1">
                    <strong>{doc.nom}</strong> (Ajouté le {formatDate(doc.created_at)}) - Pièce jointe N°{doc.id}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mb-6 text-italic text-muted">Aucune réunion ou document administratif enregistré durant cette période.</p>
          )}

          {/* FONCTIONNEMENT */}
          <h3 className="report-section-title">2. Synthèse du Fonctionnement Interne</h3>
          <p className="mb-3">En ce qui concerne le fonctionnement interne de la structure, voici le résumé financier des opérations :</p>
          <div className="report-summary-box">
            <div className="report-grid-2">
              <div>
                <strong>Entrées :</strong>
                {r.fonctionnement.entrees.length === 0 && <span> Aucune</span>}
                <ul className="pl-4 mt-1">
                  {r.fonctionnement.entrees.map((e) => (
                    <li key={e.devise} className="text-success fw-semibold">{formatMoney(e.total, e.devise)} {e.devise}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Sorties :</strong>
                {r.fonctionnement.sorties.length === 0 && <span> Aucune</span>}
                <ul className="pl-4 mt-1">
                  {r.fonctionnement.sorties.map((s) => (
                    <li key={s.devise} className="text-danger fw-semibold">{formatMoney(s.total, s.devise)} {s.devise}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* PROJETS */}
          <h3 className="report-section-title">3. État des Projets</h3>
          {r.projets && r.projets.length > 0 ? (
            <>
              <p className="mb-4">Dans la période sélectionnée, nous avons effectué des opérations en relation avec les projets suivants :</p>
              {r.projets.map((p) => {
                const ratio = p.budget_usd > 0 ? (p.total_depense / p.budget_usd) * 100 : 0;
                return (
                  <div key={p.id} className="report-project-card">
                    <h4 className="mb-2 report-text-lg">{p.nom} <span className="badge badge-secondary float-right">Statut: {p.statut}</span></h4>
                    <p className="mb-2">
                      <strong>Responsable :</strong> {p.emp_nom ? `${p.emp_prenom} ${p.emp_nom}` : 'Non assigné'}<br/>
                      <strong>Budget Alloué :</strong> {formatMoney(p.budget_usd, 'USD')} USD
                    </p>
                    <p>
                      Au vu des prévisions, un total de <strong>{formatMoney(p.total_depense, p.devise_depense)} {p.devise_depense}</strong> de dépenses a été enregistré pour ce projet durant cette période, représentant une utilisation d'environ <strong>{ratio.toFixed(2)}%</strong> du budget.
                    </p>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="text-italic text-muted">Aucun mouvement lié aux projets durant cette période.</p>
          )}

          <div className="report-signature">
            <p><strong>Approuvé par la direction</strong></p>
            <p className="text-xs text-muted">Document généré depuis Saphir Group</p>
          </div>
        </div>
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
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-10 text-muted">Aucun rapport généré pour le moment. Cliquez sur "Générer Rapport" pour commencer.</td>
                </tr>
              ) : reports.map(r => (
                <tr key={r.id}>
                  <td className="w-[200px]">{new Date(r.created_at).toLocaleString()}</td>
                  <td><strong>{r.titre}</strong></td>
                  <td>
                    <span className={`badge ${r.type === 'detaille' ? 'badge-purple' : 'badge-info'}`}>
                      {r.type === 'detaille' ? 'Détaillé' : 'Rapide'}
                    </span>
                  </td>
                  <td className="w-[150px]">
                    <div className="flex-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleViewReport(r.id)}>Ouvrir</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>✖</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
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
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Génération...' : '📃 Valider / Générer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
