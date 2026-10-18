import { useState } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { productApi, useProductStore, QUICK_SELL_MAX, type Product } from '../stores/productStore';
import { useDebouncedSearch } from '../hooks/useDebounce';
import { toast } from '../stores/toastStore';
import { formatPrice } from '../lib/utils';

export function QuickSellManager({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { quickSell, setQuickSell } = useProductStore();
  const [query, setQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { results, loading } = useDebouncedSearch(query, (q) => (q.trim() ? productApi.search(q) : Promise.resolve([] as Product[])));
  const full = quickSell.length >= QUICK_SELL_MAX;

  const save = (list: Product[]) => setQuickSell(list).catch((e) => toast(errorMessage(e), 'error'));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= quickSell.length || from === to) return;
    const list = [...quickSell];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    save(list);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('quick_sell.title')} ({quickSell.length}/{QUICK_SELL_MAX})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <div className="relative">
              <Input placeholder={t('quick_sell.search_to_add')} value={query} onChange={(e) => setQuery(e.target.value)} />
              {loading && <Spinner className="absolute right-3 top-3" />}
            </div>
            {full && <div className="text-sm text-danger">{t('errors.quick_sell_limit')}</div>}
            <div className="max-h-80 overflow-auto space-y-1">
              {results.map((p) => {
                const added = quickSell.some((q) => q.id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 border border-border rounded-md p-2">
                    <div className="text-sm"><div className="font-medium">{p.name}</div><div className="text-ink-muted tabular-nums">{formatPrice(p.price)}</div></div>
                    <Button size="sm" className="h-10 min-w-10" disabled={added || full} onClick={() => save([...quickSell, p])} aria-label={t('quick_sell.add')}>+</Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="max-h-96 overflow-auto space-y-1" data-testid="quick-sell-list">
            {quickSell.length === 0 && <div className="text-sm text-ink-muted">{t('quick_sell.empty')}</div>}
            {quickSell.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
                className="flex items-center gap-1 border border-border rounded-md p-1 bg-surface cursor-grab"
              >
                <span className="text-ink-muted w-6 text-center">{i + 1}</span>
                <span className="flex-1 text-sm truncate">{p.name}</span>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t('quick_sell.up')}>▲</Button>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" disabled={i === quickSell.length - 1} onClick={() => move(i, i + 1)} aria-label={t('quick_sell.down')}>▼</Button>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-danger" onClick={() => save(quickSell.filter((q) => q.id !== p.id))} aria-label={t('cart.remove')}>✕</Button>
              </div>
            ))}
          </div>
        </div>
        <Button variant="outline" className="h-12" onClick={onClose}>{t('general.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
