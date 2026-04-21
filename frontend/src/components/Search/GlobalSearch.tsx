import { useState } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  source_type: 'transaction' | 'archive' | 'document';
  id: string | number;
  date: string;
  type: string;
  libelle: string;
  montant: number;
  currency: string;
  project_id?: string | number;
  justificatif_url?: string;
  responsable?: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!q && !startDate && !endDate) {
      toast.error('Veuillez renseigner un mot-clé ou une période');
      return;
    }
    setLoading(true);
    try {
      const res = await API.get('/search', { params: { q, startDate, endDate } });
      setResults(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type: 'rapide' | 'detaille') => {
    if (!startDate && !endDate && !q) return;
    try {
      const params: any = { type };
      if (startDate) params.date_debut = startDate;
      if (endDate) params.date_fin = endDate;
      
      await API.post('/reports/narrative/generate', params);
      toast.success('Rapport ' + type + ' généré avec succès');
      setIsOpen(false);
      navigate('/rapports');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur lors de la génération du rapport');
    }
  };

  return (
    <>
      <button className="btn btn-secondary" style={{ marginRight: '15px' }} onClick={() => setIsOpen(true)}>
        🔍 Recherche Globale
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Recherche Globale & Rapports</h3>
              <button className="btn-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            
            <form className="modal-body" onSubmit={handleSearch}>
              <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mot-clé</label>
                  <input type="text" className="form-control" value={q} onChange={e => setQ(e.target.value)} placeholder="Libellé, Projet, etc." />
                </div>
                <div className="form-group" style={{ width: '150px' }}>
                  <label>Date de début</label>
                  <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: '150px' }}>
                  <label>Date de fin</label>
                  <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Recherche...' : 'Rechercher'}
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => generateReport('rapide')} disabled={loading || (!startDate && !endDate)}>
                     📄 Rapport Rapide
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => generateReport('detaille')} disabled={loading || (!startDate && !endDate)}>
                     📑 Rapport Détaillé
                  </button>
                </div>
              </div>

              {results.length > 0 && (
                <div style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Source</th>
                        <th>Libellé</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i}>
                          <td>{new Date(r.date).toLocaleDateString()}</td>
                          <td>{r.type}</td>
                          <td><span style={{ padding: '2px 6px', borderRadius: '4px', background: r.source_type === 'transaction' ? '#e3f2fd' : '#f5f5f5', fontSize: '12px' }}>{r.source_type}</span></td>
                          <td>{r.libelle}</td>
                          <td>{r.montant ? `${r.montant} ${r.currency || ''}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
