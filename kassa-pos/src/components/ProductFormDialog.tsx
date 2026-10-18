import React, { useState } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { productApi, useProductStore, type Product, type ProductInput } from '../stores/productStore';
import { toast } from '../stores/toastStore';

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export function ProductFormDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { t } = useTranslation();
  const bump = useProductStore((s) => s.bump);
  const [f, setF] = useState({
    category: product?.category ?? '',
    name: product?.name ?? '',
    barcode: product?.barcode ?? '',
    code: product?.code ?? '',
    unit: product?.unit ?? 'шт',
    stock_qty: product ? String(product.stock_qty) : '',
    cost_price: product?.cost_price?.toString() ?? '',
    wholesale_price: product?.wholesale_price?.toString() ?? '',
    price: product ? String(product.price) : '',
    expiry_date: product?.expiry_date ?? '',
    vat: product?.vat?.toString() ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: ProductInput = {
      category: f.category || null, name: f.name, barcode: f.barcode || null, code: f.code || null, unit: f.unit || null,
      stock_qty: num(f.stock_qty) ?? 0, cost_price: num(f.cost_price), wholesale_price: num(f.wholesale_price),
      price: num(f.price) ?? 0, expiry_date: f.expiry_date || null, vat: num(f.vat),
    };
    if ([input.stock_qty, input.cost_price, input.wholesale_price, input.price, input.vat].some((n) => n !== null && Number.isNaN(n))) {
      setError(t('errors.invalid_number'));
      return;
    }
    setSaving(true);
    try {
      if (product) await productApi.update(product.id, input); else await productApi.create(input);
      toast(t('products.saved'), 'success');
      bump();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? t('products.edit') : t('products.new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-2">
          <div className="col-span-2"><Input label={t('products.name') + ' *'} required value={f.name} onChange={set('name')} /></div>
          <Input label={t('products.category')} value={f.category} onChange={set('category')} />
          <Input label={t('products.unit')} value={f.unit} onChange={set('unit')} />
          <Input label={t('products.barcode')} value={f.barcode} onChange={set('barcode')} />
          <Input label={t('products.code')} value={f.code} onChange={set('code')} inputMode="numeric" />
          <Input label={t('products.quantity')} inputMode="decimal" value={f.stock_qty} onChange={set('stock_qty')} />
          <Input label={t('products.retail_price') + ' *'} required inputMode="decimal" value={f.price} onChange={set('price')} />
          <Input label={t('products.cost_price')} inputMode="decimal" value={f.cost_price} onChange={set('cost_price')} />
          <Input label={t('products.wholesale_price')} inputMode="decimal" value={f.wholesale_price} onChange={set('wholesale_price')} />
          <Input label={t('products.expiry_date')} type="date" value={f.expiry_date} onChange={set('expiry_date')} />
          <Input label={t('products.vat')} inputMode="decimal" value={f.vat} onChange={set('vat')} />
          {error && <div className="col-span-2 text-sm text-danger" role="alert">{error}</div>}
          <div className="col-span-2 flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" className="h-12" onClick={onClose}>{t('general.cancel')}</Button>
            <Button type="submit" className="h-12" disabled={saving}>{t('general.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
