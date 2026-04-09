export type UserRole = 'admin' | 'comptable' | 'consultant';

export interface User {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string | null;
  role: UserRole;
  actif?: number;
}

export interface Employee {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  telephone?: string;
  email?: string;
  date_embauche?: string;
  actif: number;
}

export interface Project {
  id: number;
  nom: string;
  client?: string;
  budget_usd: number;
  budget_cdf: number;
  statut: 'actif' | 'termine' | 'en_pause';
  date_debut?: string;
  date_fin?: string;
  description?: string;
  type_gestion: 'plein_pouvoir' | 'partiel' | 'main_oeuvre';
}

export interface Account {
  id: number;
  nom: string;
  type: 'caisse' | 'banque';
  devise: 'USD' | 'CDF';
  solde_initial: number;
  solde_actuel: number;
}

export interface Category {
  id: number;
  nom: string;
  type: 'entree' | 'sortie';
  nature: 'fonctionnement' | 'projet' | 'general';
}

export interface Transaction {
  id: number;
  date: string;
  type: 'entree' | 'sortie';
  montant: number;
  devise: 'USD' | 'CDF';
  account_id: number;
  account_nom?: string;
  account_type?: string;
  category_id?: number;
  category_nom?: string;
  nature: 'fonctionnement' | 'projet';
  project_id?: number;
  project_nom?: string;
  employee_id?: number;
  employee_nom?: string;
  employee_prenom?: string;
  emp_nom?: string;
  emp_prenom?: string;
  user_id?: number;
  user_nom?: string;
  description?: string;
  reference?: string;
  is_remboursable: number; // 0 or 1 from SQLite
  document_refs?: string[];
  created_at?: string;
}

export interface Document {
  id: number;
  reference?: string;
  nom: string;
  type: 'admin' | 'justificatif' | 'reconnaissance';
  file_url: string;
  transaction_id?: number | null;
  created_at: string;
}

export interface DashboardData {
  accounts: Account[];
  month: {
    entrees_usd: number;
    sorties_usd: number;
    entrees_cdf: number;
    sorties_cdf: number;
  };
  recentTransactions: Transaction[];
  stats: {
    activeProjects: number;
    totalEmployees: number;
    totalTransactions: number;
    disbursements_usd: number;
    disbursements_cdf: number;
  };
  chartData: {
    label: string;
    entrees_usd: number;
    sorties_usd: number;
    entrees_cdf: number;
    sorties_cdf: number;
  }[];
}
export interface Report {
  id: number;
  titre: string;
  type: 'rapide' | 'detaille';
  contenu: string; // JSON string in DB
  created_at: string;
}

export interface ReportContent {
  titre: string;
  date_debut?: string;
  date_fin?: string;
  documents: { id: number; nom: string; created_at: string }[];
  fonctionnement: {
    entrees: { total: number; devise: 'USD' | 'CDF' }[];
    sorties: { total: number; devise: 'USD' | 'CDF' }[];
  };
  projets: (Project & { total_depense: number; devise_depense: 'USD' | 'CDF'; emp_nom: string; emp_prenom: string })[];
}

export interface DecodedReport extends Omit<Report, 'contenu'> {
  contenu: ReportContent;
}

export interface CompanySettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  [key: string]: string;
}
