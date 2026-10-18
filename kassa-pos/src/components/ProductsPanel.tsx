import { useState } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Spinner } from './ui/Spinner';
import { QuickSellGrid } from './QuickSellGrid';
import { ProductFormDialog } from './ProductFormDialog';
import { productApi, useProductStore, type Product } from '../stores/productStore';
import { useDebouncedSearch } from '../hooks/useDebounce';
import { toast } from '../stores/toastStore';
import { formatPrice } from '../lib/utils';

export function ProductsPanel() {
  const { t } = useTranslation();
  const { revision, bump } = useProductStore();
  const [query, setQuery] = useState('');
  const [customOnly, setCustomOnly] = useState(false);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const { results, loading } = useDebouncedSearch(query, (q) => productApi.list(q, customOnly), [customOnly, revision]);

  const remove = async (p: Product) => {
    if (!confirm(t('products.delete_confirm').replace('{name}', p.name))) return;
    try {
      await productApi.remove(p.id);
      toast(t('products.deleted'), 'success');
      bump();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-ink-muted mb-2">{t('quick_sell.title')}</h3>
        <div className="max-h-56 overflow-auto"><QuickSellGrid compact /></div>
      </div>
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Input placeholder={t('products.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          {loading && <Spinner className="absolute right-3 top-3" />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4" checked={customOnly} onChange={(e) => setCustomOnly(e.target.checked)} />
            {t('products.custom_only')}
          </label>
          <Button size="sm" className="h-10" onClick={() => setEditing(null)}>+ {t('products.new')}</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {results.length === 0 && !loading && <div className="text-sm text-ink-muted">{t('products.not_found')}</div>}
        {results.map((p) => (
          <div key={p.id} className="border border-border rounded-md p-2">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-sm">{p.name}</span>
              <span className="tabular-nums text-sm font-bold whitespace-nowrap">{formatPrice(p.price)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-ink-muted mt-1">
              <span>
                {p.code && <>#{p.code} · </>}{p.barcode ?? '—'} · {formatPrice(p.stock_qty)} {p.unit}
              </span>
              {p.is_custom && <Badge variant="default">{t('products.custom')}</Badge>}
            </div>
            {p.is_custom && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => setEditing(p)}>{t('products.edit')}</Button>
                <Button variant="outline" size="sm" className="flex-1 h-10 text-danger" onClick={() => remove(p)}>{t('cart.remove')}</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {editing !== undefined && <ProductFormDialog product={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
