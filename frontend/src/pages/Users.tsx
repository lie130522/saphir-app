import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import API from '../api/client';
import type { User } from '../types';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: 0,
    nom: '',
    email: '',
    telephone: '',
    role: 'consultant' as User['role'],
    password: '',
    sendInvite: true
  });

  const loadUsers = async () => {
    try {
      const res = await API.get('/auth/users');
      setUsers(res.data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = (u?: User) => {
    if (u) {
      setFormData({
        id: u.id,
        nom: u.nom,
        email: u.email,
        telephone: u.telephone || '',
        role: u.role,
        password: '', // Don't show password, only needed if changing
        sendInvite: false
      });
    } else {
      setFormData({
        id: 0,
        nom: '',
        email: '',
        telephone: '',
        role: 'consultant',
        password: '',
        sendInvite: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.id) {
        await API.put(`/auth/users/${formData.id}`, formData);
      } else {
        await API.post('/auth/users', formData);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Désactiver ou supprimer cet utilisateur ?')) return;
    try {
      await API.delete(`/auth/users/${id}`);
      loadUsers();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  return (
    <Layout title="Utilisateurs" subtitle="Gestion des accès" actions={
      <button className="btn btn-primary" onClick={() => handleOpenModal()}>
        + Nouvel Utilisateur
      </button>
    }>
      
      <div className="table-wrapper mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="fw-semibold">{u.nom} {u.prenom}</td>
                <td className="text-muted">{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'comptable' ? 'badge-primary' : 'badge-secondary'}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.actif ? 'badge-success' : 'badge-danger'}`}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <div className="flex-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(u)}>📝 Editer</button>
                    {u.role !== 'admin' && u.actif === 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Désactiver</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <div className="modal-title">{formData.id ? 'Editer Utilisateur' : 'Nouvel Utilisateur'}</div>
                <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
              </div>
              <div className="modal-body flex-col-gap-4">
                <div className="form-group">
                  <label className="form-label">Nom complet *</label>
                  <input type="text" className="form-input" title="Nom complet" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" title="Email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input type="tel" className="form-input" title="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle *</label>
                  <select className="form-input" title="Rôle" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                    <option value="consultant">Consultant / Observateur</option>
                    <option value="comptable">Comptable / Caisse</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                {!formData.id && (
                  <div className="form-group flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="sendInvite" 
                      title="Envoyer une invitation par e-mail"
                      checked={formData.sendInvite} 
                      onChange={e => setFormData({...formData, sendInvite: e.target.checked})} 
                    />
                    <label htmlFor="sendInvite" className="form-label mb-0 cursor-pointer">
                      Envoyer une invitation par e-mail (Mot de passe auto-généré)
                    </label>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{formData.id ? 'Mot de passe (laisser vide pour ne pas modifier)' : 'Mot de passe *'}</label>
                  <input 
                    type="password" 
                    title="Mot de passe" 
                    className="form-input" 
                    required={!formData.id && !formData.sendInvite} 
                    disabled={!formData.id && formData.sendInvite}
                    placeholder={!formData.id && formData.sendInvite ? 'Généré automatiquement' : ''}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    minLength={6} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
