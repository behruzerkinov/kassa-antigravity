import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n/i18nContext';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { formatPrice, formatDateTime } from '../lib/utils';
import { useDebouncedSearch } from '../hooks/useDebounce';
import { useAuthStore } from '../stores/authStore';
import { printReceipt } from '../lib/printing';
import { ReturnsModal } from '../pages/ReturnsModal';

interface TransactionSummary {
  id: number;
  kind: string;
  total: number;
  status: string;
  created_at: string;
  client_name: string | null;
}

export function ReceiptsPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const { results: receipts, loading, refresh } = useDebouncedSearch(
    search,
    (q) => invoke<TransactionSummary[]>('get_receipts', {
      token: useAuthStore.getState().token,
      search: q.trim() || null,
      dateFrom: dateFrom || dateTo ? dateFrom || '0000-01-01' : null,
      dateTo: dateFrom || dateTo ? `${dateTo || '9999-12-31'}T23:59:59` : null,
    }),
    [dateFrom, dateTo],
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-4 border-b border-border space-y-4">
        <div className="relative">
          <Input placeholder={t('receipts.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading && <Spinner className="absolute right-3 top-3" />}
        </div>
        <div className="flex gap-2">
          <Input type="date" className="flex-1" aria-label={t('receipts.date_from')} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" className="flex-1" aria-label={t('receipts.date_to')} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={refresh}>{t('receipts.refresh')}</Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {receipts.length === 0 && !loading && <div className="text-sm text-ink-muted">{t('receipts.empty')}</div>}
        {receipts.map((r) => (
          <div key={r.id} className="border border-border rounded-lg p-3 bg-surface hover:bg-surface-raised transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-ink">{t('receipts.receipt_no').replace('{id}', String(r.id))}</span>
              <span className="text-sm text-ink-muted">{formatDateTime(r.created_at)}</span>
            </div>
            <div className="text-xl font-bold tabular-nums mb-2">{formatPrice(r.total)}</div>
            <div className="flex justify-between items-center text-sm">
              <Badge variant={r.status === 'success' ? 'success' : 'warning'}>
                {t(`receipt_statuses.${r.status}`)}
              </Badge>
              {r.client_name && <span className="text-ink-muted">{r.client_name}</span>}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => printReceipt(r.id)}>{t('receipts.reprint')}</Button>
              <Button variant="outline" size="sm" className="flex-1 h-10 text-danger" onClick={() => setIsReturnModalOpen(true)}>{t('returns.title')}</Button>
            </div>
          </div>
        ))}
      </div>

      {isReturnModalOpen && <ReturnsModal onClose={() => setIsReturnModalOpen(false)} />}
    </div>
  );
}
