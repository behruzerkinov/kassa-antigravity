import { useEffect, useState } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { productApi, type Product } from '../stores/productStore';
import { useCartStore } from '../stores/cartStore';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from '../stores/toastStore';
import { formatPrice, cn } from '../lib/utils';
import { Spinner } from './ui/Spinner';

type Field = 'code' | 'qty';

export function Numpad() {
  const { t } = useTranslation();
  const addProductById = useCartStore((s) => s.addProductById);
  const [code, setCode] = useState('');
  const [qty, setQty] = useState('');
  const [field, setField] = useState<Field>('code');
  const [product, setProduct] = useState<Product | null>(null);
  const [looking, setLooking] = useState(false);
  const debouncedCode = useDebounce(code, 200);

  useEffect(() => {
    if (!debouncedCode) { setProduct(null); return; }
    let cancelled = false;
    setLooking(true);
    productApi.findByCode(debouncedCode)
      .then((p) => { if (!cancelled) setProduct(p); })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLooking(false); });
    return () => { cancelled = true; };
  }, [debouncedCode]);

  const pending = code !== debouncedCode || looking;
  const canAdd = !!product && !pending && code === debouncedCode;

  const press = (d: string) => (field === 'code' ? setCode((c) => c + d) : setQty((q) => (q + d).replace(/^0+(?=\d)/, '')));
  const back = () => (field === 'code' ? setCode((c) => c.slice(0, -1)) : setQty((q) => q.slice(0, -1)));
  const clear = () => { setCode(''); setQty(''); setField('code'); setProduct(null); };

  const add = async () => {
    if (!product) return;
    const amount = parseInt(qty || '1', 10);
    try {
      await addProductById(product.id, amount > 0 ? amount : 1);
      clear();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const display = (f: Field, value: string, placeholder: string) => (
    <button
      type="button"
      onClick={() => setField(f)}
      className={cn('w-full h-12 rounded-md border px-3 text-right text-xl tabular-nums bg-surface', field === f ? 'border-accent ring-2 ring-accent/40' : 'border-border')}
    >
      <span className="float-left text-xs text-ink-muted mt-1">{t(`numpad.${f}`)}</span>
      {value || <span className="text-ink-muted">{placeholder}</span>}
    </button>
  );

  const key = 'h-14 rounded-md border border-border bg-surface text-xl font-medium hover:bg-surface-raised active:bg-border select-none';

  return (
    <div className="flex flex-col gap-2 p-3 w-64 border-r border-border bg-surface-raised" data-testid="numpad">
      <div className="min-h-16 rounded-md border border-border bg-surface p-2" data-testid="numpad-preview">
        {!code ? (
          <div className="text-sm text-ink-muted">{t('numpad.hint')}</div>
        ) : pending ? (
          <Spinner />
        ) : product ? (
          <>
            <div className="font-medium line-clamp-2">{product.name}</div>
            <div className="text-lg font-bold tabular-nums">{formatPrice(product.price)}</div>
          </>
        ) : (
          <div className="text-danger font-medium">{t('numpad.not_found')}</div>
        )}
      </div>
      {display('code', code, '—')}
      {display('qty', qty, '1')}
      <div className="grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((d) => (
          <button key={d} type="button" className={key} onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" className={cn(key, 'text-base')} onClick={clear} aria-label={t('numpad.clear')}>{t('numpad.clear_short')}</button>
        <button type="button" className={key} onClick={() => press('0')}>0</button>
        <button type="button" className={key} onClick={back} aria-label={t('numpad.backspace')}>⌫</button>
      </div>
      <button
        type="button"
        className="h-14 rounded-md bg-accent text-white text-2xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canAdd}
        onClick={add}
        aria-label={t('numpad.add')}
      >
        +
      </button>
    </div>
  );
}
