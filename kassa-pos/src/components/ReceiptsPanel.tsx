import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatPrice } from '../lib/utils';
import { ReturnsModal } from '../pages/ReturnsModal';

export function ReceiptsPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Mock data for display
  const receipts = [
    { id: 101, time: '14:30', total: 150000, status: 'success', itemCount: 3 },
    { id: 102, time: '14:45', total: 50000, status: 'debt_added', itemCount: 1 },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-4 border-b border-border space-y-4">
        <Input 
          placeholder={t('receipts.search')} 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        <div className="flex gap-2">
          <Input type="date" className="flex-1" />
          <Input type="date" className="flex-1" />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {receipts.map(r => (
          <div key={r.id} className="border border-border rounded-lg p-3 bg-surface hover:bg-surface-raised cursor-pointer transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-ink">Чек #{r.id}</span>
              <span className="text-sm text-ink-muted">{r.time}</span>
            </div>
            <div className="text-xl font-bold tabular-nums mb-2">{formatPrice(r.total)}</div>
            <div className="flex justify-between items-center text-sm">
              <Badge variant={r.status === 'success' ? 'success' : 'warning'}>
                {t(`receipt_statuses.${r.status}`)}
              </Badge>
              <span className="text-ink-muted">{r.itemCount} товара</span>
            </div>
            
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1">{t('receipts.reprint')}</Button>
              <Button variant="outline" size="sm" className="flex-1 text-danger" onClick={() => setIsReturnModalOpen(true)}>{t('returns.title')}</Button>
            </div>
          </div>
        ))}
      </div>

      {isReturnModalOpen && <ReturnsModal onClose={() => setIsReturnModalOpen(false)} />}
    </div>
  );
}
