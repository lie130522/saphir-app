export function formatMoney(amount: number, currency: 'USD' | 'CDF'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat('fr-CD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' CDF';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('fr-FR');
}

export function getMonthRange(): { debut: string; fin: string } {
  const now = new Date();
  const debut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const fin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { debut, fin };
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
