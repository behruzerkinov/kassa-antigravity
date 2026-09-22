import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PaymentModal } from './PaymentModal';
import { formatPrice, cn } from '../lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/authStore';

export function SellPage() {
  const { t } = useTranslation();
  const { carts, activeCartIndex, activeCart, setActiveTab, createCart, addToCart, updateItemQty, removeItem, clearCart, parkCart } = useCartStore();
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (carts.length === 0) {
      createCart();
    }
  }, [carts, createCart]);

  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [activeCartIndex, isPaymentOpen]);

  const handleScannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    try {
      await addToCart(barcode.trim());
      setBarcode('');
    } catch (err: any) {
      console.error(err);
      // Handle error (e.g., show toast)
    }
  };

  const handleClear = async () => {
    if (confirm(t('cart.clear') + '?')) {
      await clearCart();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (activeCart && activeCart.total > 0) {
          // Instant cash
          handleInstantPayment('cash');
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (activeCart && activeCart.total > 0) {
          // Instant card
          handleInstantPayment('card');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCart]);

  const handleInstantPayment = async (method: 'cash' | 'card') => {
    if (!activeCart) return;
    try {
      const token = useAuthStore.getState().token;
      const cashAmount = method === 'cash' ? activeCart.total : 0;
      const cardAmount = method === 'card' ? activeCart.total : 0;
      await invoke('process_payment', {
        token,
        cartId: activeCart.id,
        cashAmount,
        cardAmount,
        clientId: null,
        debtAmount: 0,
      });
      await useCartStore.getState().refreshCarts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Top Section */}
      <div className="p-4 border-b border-border flex flex-col gap-2">
        <div className="flex gap-4">
          <form onSubmit={handleScannerSubmit} className="flex-1">
            <Input
              ref={scannerRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={t('products.scan')}
              autoFocus
            />
          </form>
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('products.search') + '...'}
            />
          </div>
        </div>

        {/* Cart Tabs */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1 mt-2">
          {carts.map((cart, idx) => (
            <button
              key={cart.id}
              onClick={() => setActiveTab(idx)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                activeCartIndex === idx 
                  ? "bg-accent text-white" 
                  : "bg-surface-raised text-ink hover:bg-border/50"
              )}
            >
              {cart.name || `Корзина ${idx + 1}`}
              <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-xs">
                {cart.items.length}
              </span>
            </button>
          ))}
          {carts.length < 10 && (
            <Button variant="ghost" size="icon" onClick={() => createCart()}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4">
                <path d="M7.49991 1V7.5M7.49991 14V7.5M7.49991 7.5H14M7.49991 7.5H1" stroke="currentColor" strokeLinecap="round"/>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Middle Section - Items */}
      <div className="flex-1 overflow-auto p-4">
        {!activeCart || activeCart.items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ink-muted">
            Добавьте товары в корзину
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-[3rem_1fr_6rem_8rem_6rem_3rem] gap-4 font-medium text-ink-muted text-sm pb-2 border-b border-border">
              <div>№</div>
              <div>{t('cart.product')}</div>
              <div className="text-right">{t('cart.price')}</div>
              <div className="text-center">{t('cart.qty')}</div>
              <div className="text-right">{t('cart.total')}</div>
              <div></div>
            </div>
            
            <div className="flex flex-col">
              {activeCart.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[3rem_1fr_6rem_8rem_6rem_3rem] gap-4 py-3 border-b border-border items-center">
                  <div className="text-sm text-ink-muted">{idx + 1}</div>
                  <div className="font-medium text-ink">{item.name}</div>
                  <div className="text-right tabular-nums">{formatPrice(item.price)}</div>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateItemQty(item.id, item.qty - 1)}>-</Button>
                    <span className="tabular-nums w-8 text-center">{item.qty}</span>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateItemQty(item.id, item.qty + 1)}>+</Button>
                  </div>
                  <div className="text-right tabular-nums font-medium">{formatPrice(item.total)}</div>
                  <div className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-danger" onClick={() => removeItem(item.id)}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.21841C3.80708 2.99386 3.44301 2.99386 3.21846 3.21841C2.99391 3.44297 2.99391 3.80703 3.21846 4.03159L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section - Totals & Actions */}
      <div className="p-6 bg-surface-raised border-t border-border mt-auto">
        <div className="flex flex-col items-end mb-6">
          {activeCart && activeCart.discount_val && (
             <div className="text-xl text-ink-muted mb-1">
               {t('cart.discount')}: -{formatPrice(activeCart.discount_val)}
             </div>
          )}
          <div className="text-5xl font-bold tabular-nums text-ink tracking-tight">
            {t('cart.total')}: {activeCart ? formatPrice(activeCart.total) : '0'}
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 h-14 text-lg">Скидка на чек</Button>
          <Button variant="outline" className="flex-1 h-14 text-lg" onClick={() => parkCart('Отложено')}>
            {t('cart.park')}
          </Button>
          <Button variant="outline" className="flex-1 h-14 text-lg text-danger hover:bg-danger hover:text-white" onClick={handleClear}>
            {t('cart.clear')}
          </Button>
          <Button 
            className="flex-[2] h-14 text-xl bg-accent text-white hover:bg-accent-hover relative" 
            onClick={() => setIsPaymentOpen(true)}
            disabled={!activeCart || activeCart.items.length === 0}
          >
            {t('payment.submit')}
            <span className="absolute bottom-1 right-2 text-xs opacity-70 font-normal">F1 / F2</span>
          </Button>
        </div>
      </div>

      {isPaymentOpen && (
        <PaymentModal onClose={() => setIsPaymentOpen(false)} cart={activeCart} />
      )}
    </div>
  );
}
