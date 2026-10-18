import React, { useState } from 'react';
import { Titlebar } from '../components/Titlebar';
import { StatusBar } from '../components/StatusBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { useTranslation } from '../i18n/i18nContext';
import { SellPage } from '../pages/SellPage';
import { ReceiptsPanel } from '../components/ReceiptsPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { ProductsPanel } from '../components/ProductsPanel';
import { QuickSellGrid } from '../components/QuickSellGrid';
import { formatPrice } from '../lib/utils';
import { SmenaControls } from '../components/SmenaControls';
import { useCartStore } from '../stores/cartStore';

export function AppLayout() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('cart');
  const { activeCart } = useCartStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex justify-between items-center bg-surface-raised border-b border-border">
        <div className="flex-1">
          <Titlebar />
        </div>
        <div className="pr-4 py-1 z-10 absolute right-10 top-0 mt-1">
          <SmenaControls />
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left main content area */}
        <div className="flex-1 border-r border-border flex flex-col bg-surface">
          <SellPage />
        </div>

        {/* Right side panel */}
        <div className="w-96 flex flex-col bg-surface-raised z-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="p-2 border-b border-border">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="cart">{t('cart.title')}</TabsTrigger>
                <TabsTrigger value="products">{t('products.title')}</TabsTrigger>
                <TabsTrigger value="receipts">{t('receipts.title')}</TabsTrigger>
                <TabsTrigger value="settings">{t('settings.title')}</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="cart" className="mt-0 h-full overflow-auto flex flex-col">
                <div className="flex-1">
                {activeCart && activeCart.items.length > 0 ? (
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium text-ink">{activeCart.name || t('cart.current')}</h3>
                    <div className="text-sm text-ink-muted mb-4">{t('cart.items_count').replace('{n}', String(activeCart.items.length))}</div>
                    {activeCart.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b border-border">
                        <span className="truncate pr-2">{item.name}</span>
                        <span className="font-medium tabular-nums">{item.qty} x {formatPrice(item.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 flex items-center justify-center text-ink-muted text-sm">
                    {t('cart.empty')}
                  </div>
                )}
                </div>
                <div className="p-3 border-t border-border">
                  <h4 className="text-sm font-medium text-ink-muted mb-2">{t('quick_sell.title')}</h4>
                  <QuickSellGrid compact />
                </div>
              </TabsContent>
              <TabsContent value="products" className="mt-0 h-full overflow-hidden">
                <ProductsPanel />
              </TabsContent>
              <TabsContent value="receipts" className="mt-0 h-full overflow-hidden">
                <ReceiptsPanel />
              </TabsContent>
              <TabsContent value="settings" className="mt-0 h-full overflow-hidden">
                <SettingsPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
