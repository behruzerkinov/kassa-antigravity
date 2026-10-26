import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Titlebar } from '../components/Titlebar';
import { StatusBar } from '../components/StatusBar';
import { useTranslation } from '../i18n/i18nContext';
import { SellPage } from '../pages/SellPage';
import { ReceiptTape } from '../components/ReceiptTape';
import { ReceiptsPanel } from '../components/ReceiptsPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { SmenaControls } from '../components/SmenaControls';
import { LogoutConfirmDialog } from '../components/LogoutConfirmDialog';
import { PaymentModal, type PaymentMethod } from '../pages/PaymentModal';
import { NumpadPanel } from '../components/NumpadPanel';
import { CartRail } from '../components/CartRail';
import { Hash, ReceiptText, Settings2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSyncStore } from '../stores/syncStore';
import { cn } from '../lib/utils';

type Panel = 'numpad' | 'receipts' | 'settings';

export function AppLayout() {
  const { t } = useTranslation();
  const { openSmena, lockScreen, token, logoutConfirmOpen, setLogoutConfirmOpen } = useAuthStore();
  const { activeCart, createCart, refreshCarts, refreshParkedCarts } = useCartStore();
  const { lockTime, touchDeviceMode: touchMode } = useSettingsStore();
  const { refresh: refreshSync } = useSyncStore();

  const [panel, setPanel] = useState<Panel>('numpad');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [smenaOpen, setSmenaOpen] = useState(false);
  const [receiptsVersion, setReceiptsVersion] = useState(0);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current || !token) return;
    bootstrapped.current = true;
    const bootstrap = async () => {
      try {
        await refreshCarts();
        await refreshParkedCarts();
        if (useCartStore.getState().carts.length === 0) await createCart();
      } catch (error) {
        console.error(error);
      }
    };
    void bootstrap();
  }, [token, refreshCarts, refreshParkedCarts, createCart]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSync();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refreshSync]);

  useEffect(() => {
    if (!lockTime) return;
    let timer = window.setTimeout(() => void lockScreen(), lockTime * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void lockScreen(), lockTime * 60_000);
    };
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [lockTime, lockScreen]);

  const requestPayment = useCallback(
    (method: PaymentMethod) => {
      if (!useAuthStore.getState().openSmena) {
        setSmenaOpen(true);
        return;
      }
      setPaymentMethod(method);
      setPaymentOpen(true);
    },
    [],
  );

  const tabs: Array<{ id: Panel; label: string; icon: typeof Hash }> = [
    { id: 'numpad', label: t('shell.tab_numpad'), icon: Hash },
    { id: 'receipts', label: t('shell.tab_receipts'), icon: ReceiptText },
    { id: 'settings', label: t('shell.tab_settings'), icon: Settings2 },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-counter">
      <Titlebar showAccount />

      <div
        className={cn(
          'grid min-h-0 flex-1',
          touchMode
            ? 'grid-cols-[clamp(168px,15vw,232px)_minmax(0,1fr)_clamp(330px,28vw,440px)]'
            : 'grid-cols-[minmax(0,1fr)_360px]',
        )}
      >
        {touchMode && <CartRail />}

        <main className="flex min-h-0 min-w-0 flex-col border-r border-rule bg-counter">
          <SellPage
            onRequestPayment={requestPayment}
            onOpenShift={() => setSmenaOpen(true)}
            noShift={!openSmena}
            touchMode={touchMode}
          />
        </main>

        <aside className="flex min-h-0 flex-col bg-paper-deep">
          <div
            role="tablist"
            aria-label={t('shell.tabs')}
            className="flex shrink-0 border-b border-rule bg-paper"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={panel === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setPanel(tab.id)}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-2 px-2 font-medium transition-colors',
                    touchMode ? 'min-h-16 text-[15px]' : 'min-h-11 py-3 text-[13px]',
                    panel === tab.id
                      ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-carbon'
                      : 'text-ink-soft hover:bg-counter hover:text-ink',
                  )}
                >
                  {touchMode && <Icon className="h-5 w-5" strokeWidth={1.75} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div id={`panel-${panel}`} role="tabpanel" className="min-h-0 flex-1">
            {panel === 'numpad' && <NumpadPanel cart={activeCart} touchMode={touchMode} />}
            {panel === 'receipts' && <ReceiptsPanel key={receiptsVersion} />}
            {panel === 'settings' && <SettingsPanel />}
          </div>
        </aside>
      </div>

      <StatusBar onShiftClick={() => setSmenaOpen(true)} />

      {paymentOpen && activeCart && (
        <PaymentModal
          cart={activeCart}
          initialMethod={paymentMethod}
          onClose={() => setPaymentOpen(false)}
          onPaid={() => {
            setPaymentOpen(false);
            setReceiptsVersion((version) => version + 1);
          }}
        />
      )}

      <SmenaControls open={smenaOpen} onOpenChange={setSmenaOpen} />
      <LogoutConfirmDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen} />
    </div>
  );
}
