import { useEffect } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { useProductStore } from '../stores/productStore';
import { useCartStore } from '../stores/cartStore';
import { toast } from '../stores/toastStore';
import { formatPrice, cn } from '../lib/utils';

let loaded = false;

export function QuickSellGrid({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { quickSell, loadQuickSell } = useProductStore();
  const addProductById = useCartStore((s) => s.addProductById);

  useEffect(() => {
    if (!loaded) { loaded = true; loadQuickSell().catch(() => { loaded = false; }); }
  }, [loadQuickSell]);

  const add = async (id: number) => {
    try { await addProductById(id, 1); } catch (e) { toast(errorMessage(e), 'error'); }
  };

  if (quickSell.length === 0) {
    return <div className="text-sm text-ink-muted p-2">{t('quick_sell.empty')}</div>;
  }

  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-3')} data-testid="quick-sell-grid">
      {quickSell.map((p) => (
        <button
          key={p.id}
          onClick={() => add(p.id)}
          className="min-h-16 rounded-md border border-border bg-surface p-2 text-left hover:bg-accent hover:text-white active:scale-[0.98] transition-colors"
        >
          <div className="text-sm font-medium line-clamp-2">{p.name}</div>
          <div className="text-xs tabular-nums opacity-80">{formatPrice(p.price)}</div>
        </button>
      ))}
    </div>
  );
}
