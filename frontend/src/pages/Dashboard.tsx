import { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney, formatDate } from '../utils/formatters';
import type { DashboardData, Transaction } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartDevise, setChartDevise] = useState<'USD' | 'CDF'>('USD');

  useEffect(() => {
    API.get('/reports/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Tableau de bord"><div className="loading-box">⏳ Chargement...</div></Layout>;
  if (!data) return null;

  const totalUSD = data.accounts.filter(a => a.devise === 'USD').reduce((s, a) => s + a.solde_actuel, 0);
  const totalCDF = data.accounts.filter(a => a.devise === 'CDF').reduce((s, a) => s + a.solde_actuel, 0);
  const caisseUSD = data.accounts.filter(a => a.devise === 'USD' && a.type === 'caisse').reduce((s, a) => s + a.solde_actuel, 0);
  const banqueUSD = data.accounts.filter(a => a.devise === 'USD' && a.type === 'banque').reduce((s, a) => s + a.solde_actuel, 0);
  const caisseCDF = data.accounts.filter(a => a.devise === 'CDF' && a.type === 'caisse').reduce((s, a) => s + a.solde_actuel, 0);
  const banqueCDF = data.accounts.filter(a => a.devise === 'CDF' && a.type === 'banque').reduce((s, a) => s + a.solde_actuel, 0);

  const chartData = data.chartData.map(d => ({
    label: d.label,
    Entrées: chartDevise === 'USD' ? d.entrees_usd : d.entrees_cdf,
    Sorties: chartDevise === 'USD' ? d.sorties_usd : d.sorties_cdf,
  }));

  return (
    <Layout title="Tableau de bord" subtitle="Vue d'ensemble de la trésorerie">
      {/* Main balances */}
      <div className="stat-grid">
        <div className="stat-card card-accent-blue">
          <div className="stat-card-icon">💵</div>
          <div className="stat-card-label">Solde Total USD</div>
          <div className={`stat-card-value ${totalUSD >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(totalUSD, 'USD')}</div>
          <div className="stat-card-sub">Caisse: {formatMoney(caisseUSD, 'USD')} · Banque: {formatMoney(banqueUSD, 'USD')}</div>
        </div>
        <div className="stat-card card-accent-cyan">
          <div className="stat-card-icon">🏦</div>
          <div className="stat-card-label">Solde Total CDF</div>
          <div className={`stat-card-value ${totalCDF >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(totalCDF, 'CDF')}</div>
          <div className="stat-card-sub">Caisse: {formatMoney(caisseCDF, 'CDF')} · Banque: {formatMoney(banqueCDF, 'CDF')}</div>
        </div>
        <div className="stat-card card-accent-emerald">
          <div className="stat-card-icon">📥</div>
          <div className="stat-card-label">Entrées ce mois (USD)</div>
          <div className="stat-card-value amount-positive">{formatMoney(data.month.entrees_usd, 'USD')}</div>
          <div className="stat-card-sub">CDF: {formatMoney(data.month.entrees_cdf, 'CDF')}</div>
        </div>
        <div className="stat-card card-accent-red">
          <div className="stat-card-icon">📤</div>
          <div className="stat-card-label">Sorties ce mois (USD)</div>
          <div className="stat-card-value amount-negative">{formatMoney(data.month.sorties_usd, 'USD')}</div>
          <div className="stat-card-sub">CDF: {formatMoney(data.month.sorties_cdf, 'CDF')}</div>
        </div>
        <div className="stat-card card-accent-amber">
          <div className="stat-card-icon">📁</div>
          <div className="stat-card-label">Projets actifs</div>
          <div className="stat-card-value">{data.stats.activeProjects}</div>
        </div>
        <div className="stat-card card-accent-purple">
          <div className="stat-card-icon">👥</div>
          <div className="stat-card-label">Employés</div>
          <div className="stat-card-value">{data.stats.totalEmployees}</div>
          <div className="stat-card-sub">{data.stats.totalTransactions} transactions au total</div>
        </div>
        <div className="stat-card card-accent-indigo">
          <div className="stat-card-icon">💸</div>
          <div className="stat-card-label">Débours (Remboursables)</div>
          <div className={`stat-card-value text-warning`}>{formatMoney(data.stats.disbursements_usd, 'USD')}</div>
          <div className="stat-card-sub">CDF: {formatMoney(data.stats.disbursements_cdf, 'CDF')}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Chart */}
        <div className="chart-container">
          <div className="flex-between mb-4">
            <div className="chart-title">📊 Entrées vs Sorties – 6 derniers mois</div>
            <div className="flex-gap-1">
              <button onClick={() => setChartDevise('USD')} className={`btn btn-sm ${chartDevise === 'USD' ? 'btn-primary' : 'btn-secondary'}`}>USD</button>
              <button onClick={() => setChartDevise('CDF')} className={`btn btn-sm ${chartDevise === 'CDF' ? 'btn-primary' : 'btn-secondary'}`}>CDF</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
              <XAxis dataKey="label" tick={{ fill: '#8ba3c7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8ba3c7', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: '#0d1e35', border: '1px solid #1e3a5f', borderRadius: 8, color: '#f0f6ff', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Account balances */}
        <div className="card">
          <div className="chart-title">🏦 Soldes par compte</div>
          <div className="flex-col gap-2 mt-2">
            {data.accounts.map(a => (
              <div key={a.id} className="account-summary-item">
                <div>
                  <div className="text-xs fw-semibold">{a.nom}</div>
                  <div className="text-[10px] text-muted">{a.type === 'caisse' ? '💼 Caisse' : '🏦 Banque'}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm fw-bold ${a.solde_actuel >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatMoney(a.solde_actuel, a.devise)}
                  </div>
                  <div className="text-[10px] text-muted">{a.devise}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="chart-title">🕐 Dernières transactions</div>
        <div className="table-wrapper mt-3">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Catégorie</th><th>Compte</th><th>Projet</th><th>Responsable</th><th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted p-8">Aucune transaction</td></tr>
              ) : data.recentTransactions.map((t: Transaction) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td className="truncate-180">{t.description || '-'}</td>
                  <td>{t.category_nom || '-'}</td>
                  <td>{t.account_nom}</td>
                  <td>{t.project_nom || <span className="text-muted">-</span>}</td>
                  <td>{t.emp_nom ? `${t.emp_prenom} ${t.emp_nom}` : '-'}</td>
                  <td>
                    <span className={t.type === 'entree' ? 'amount-positive' : 'amount-negative'}>
                      {t.type === 'entree' ? '+' : '-'}{formatMoney(t.montant, t.devise)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
