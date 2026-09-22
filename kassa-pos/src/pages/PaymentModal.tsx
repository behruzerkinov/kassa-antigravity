import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatPrice, cn } from '../lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/authStore';
import { CartWithItems, useCartStore } from '../stores/cartStore';

interface Client {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
}

interface PaymentModalProps {
  onClose: () => void;
  cart: CartWithItems | null;
}

export function PaymentModal({ onClose, cart }: PaymentModalProps) {
  const { t } = useTranslation();
  const { refreshCarts } = useCartStore();
  const [activeTab, setActiveTab] = useState('cash');

  const total = cart?.total || 0;

  // Cash state
  const [tenderedStr, setTenderedStr] = useState(total.toString());
  const tendered = parseFloat(tenderedStr) || 0;
  const cashChange = tendered - total;

  // Split state
  const [splitCardStr, setSplitCardStr] = useState('0');
  const splitCard = parseFloat(splitCardStr) || 0;
  const splitCash = Math.max(0, total - splitCard);
  const [splitTenderedStr, setSplitTenderedStr] = useState(splitCash.toString());
  const splitTendered = parseFloat(splitTenderedStr) || 0;
  const splitChange = splitTendered - splitCash;

  // Debt state
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [debtAmountStr, setDebtAmountStr] = useState(total.toString());
  const debtAmount = parseFloat(debtAmountStr) || 0;
  const debtCashRemain = Math.max(0, total - debtAmount);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);

  useEffect(() => {
    setSplitTenderedStr(splitCash.toString());
  }, [splitCash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('cash'); }
      else if (e.key === 'F2') { e.preventDefault(); setActiveTab('card'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchClients = async (query: string) => {
    if (query.length < 2) { setClients([]); return; }
    try {
      const results = await invoke<Client[]>('search_clients', { query });
      setClients(results);
    } catch { setClients([]); }
  };

  const createNewClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const client = await invoke<Client>('create_client', {
        name: newClientName.trim(),
        phone: newClientPhone.trim() || null,
      });
      setSelectedClient(client);
      setShowNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (err) { console.error(err); }
  };

  const processPayment = async (cashAmount: number, cardAmount: number, debtAmt: number = 0, clientId: number | null = null) => {
    if (!cart) return;
    try {
      const token = useAuthStore.getState().token;
      await invoke('process_payment', {
        token,
        cartId: cart.id,
        cashAmount,
        cardAmount,
        clientId: clientId,
        debtAmount: debtAmt,
      });
      await refreshCarts();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('payment.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="cash" className="text-lg">{t('payment.cash')} (F1)</TabsTrigger>
              <TabsTrigger value="card" className="text-lg">{t('payment.card')} (F2)</TabsTrigger>
              <TabsTrigger value="split" className="text-lg">{t('payment.split')}</TabsTrigger>
              <TabsTrigger value="debt" className="text-lg">{t('payment.debt')}</TabsTrigger>
            </TabsList>

            <div className="mt-6 flex-1 flex flex-col">
              {/* Cash tab */}
              <TabsContent value="cash" className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <div className="text-ink-muted text-lg">{t('payment.due')}</div>
                  <div className="text-6xl font-bold tabular-nums mt-1">{formatPrice(total)}</div>
                </div>
                <div className="max-w-sm mx-auto w-full space-y-4 flex-1">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('payment.tendered')}</label>
                    <Input type="number" className="text-2xl h-14 text-right tabular-nums" value={tenderedStr} onChange={(e) => setTenderedStr(e.target.value)} autoFocus />
                  </div>
                  <div className="flex justify-between items-center text-xl p-4 bg-surface-raised rounded-lg border border-border">
                    <span className="text-ink-muted">{t('payment.change')}:</span>
                    <span className={`font-bold tabular-nums ${cashChange >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatPrice(Math.max(0, cashChange))}
                    </span>
                  </div>
                </div>
                <Button className="w-full h-14 text-xl mt-auto" disabled={cashChange < 0} onClick={() => processPayment(total, 0)}>
                  {t('payment.submit')}
                </Button>
              </TabsContent>

              {/* Card tab */}
              <TabsContent value="card" className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <div className="text-ink-muted text-lg">{t('payment.due')}</div>
                  <div className="text-6xl font-bold tabular-nums mt-1">{formatPrice(total)}</div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <svg className="w-24 h-24 text-ink-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <Button className="w-full h-14 text-xl mt-auto" onClick={() => processPayment(0, total)}>
                  {t('payment.submit')} ({t('payment.card')})
                </Button>
              </TabsContent>

              {/* Split tab */}
              <TabsContent value="split" className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <div className="text-ink-muted text-lg">{t('payment.due')}</div>
                  <div className="text-5xl font-bold tabular-nums mt-1">{formatPrice(total)}</div>
                </div>
                <div className="max-w-sm mx-auto w-full space-y-4 flex-1">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('payment.card')}</label>
                    <Input type="number" className="text-xl h-12 text-right tabular-nums" value={splitCardStr} onChange={(e) => setSplitCardStr(e.target.value)} />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-raised rounded-lg border border-border">
                    <span className="text-ink-muted">{t('payment.cash')}:</span>
                    <span className="font-bold tabular-nums text-lg">{formatPrice(splitCash)}</span>
                  </div>
                  {splitCash > 0 && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('payment.tendered')}</label>
                        <Input type="number" className="text-xl h-12 text-right tabular-nums" value={splitTenderedStr} onChange={(e) => setSplitTenderedStr(e.target.value)} />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-surface-raised rounded-lg border border-border">
                        <span className="text-ink-muted">{t('payment.change')}:</span>
                        <span className={`font-bold tabular-nums ${splitChange >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatPrice(Math.max(0, splitChange))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <Button className="w-full h-14 text-xl mt-auto" disabled={splitCard > total || (splitCash > 0 && splitChange < 0)} onClick={() => processPayment(splitCash, splitCard)}>
                  {t('payment.submit')}
                </Button>
              </TabsContent>

              {/* Debt tab */}
              <TabsContent value="debt" className="flex-1 flex flex-col overflow-auto">
                <div className="text-center mb-4">
                  <div className="text-ink-muted">{t('payment.due')}</div>
                  <div className="text-4xl font-bold tabular-nums mt-1">{formatPrice(total)}</div>
                </div>

                <div className="space-y-3 flex-1">
                  {/* Client search */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('debt.search_client')}</label>
                    <Input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); searchClients(e.target.value); }}
                      placeholder={t('debt.search_client') + '...'}
                    />
                  </div>

                  {/* Search results */}
                  {clients.length > 0 && !selectedClient && (
                    <div className="border border-border rounded-lg max-h-32 overflow-auto">
                      {clients.map((c) => (
                        <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-surface-raised border-b border-border last:border-0 flex justify-between" onClick={() => { setSelectedClient(c); setClients([]); }}>
                          <span>{c.name} {c.phone && <span className="text-ink-muted">({c.phone})</span>}</span>
                          <span className={cn('tabular-nums font-medium', c.balance >= 0 ? 'text-success' : 'text-danger')}>
                            {c.balance >= 0 ? '+' : ''}{formatPrice(c.balance)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* New client toggle */}
                  {!selectedClient && (
                    <div>
                      <Button variant="outline" size="sm" onClick={() => setShowNewClient(!showNewClient)}>
                        {t('debt.new_client')}
                      </Button>
                      {showNewClient && (
                        <div className="mt-2 space-y-2 p-3 border border-border rounded-lg">
                          <Input placeholder={t('debt.name')} value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                          <Input placeholder={t('debt.phone')} value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                          <Button size="sm" onClick={createNewClient}>{t('general.save')}</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected client */}
                  {selectedClient && (
                    <div className="p-3 border border-border rounded-lg bg-surface-raised">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{selectedClient.name}</div>
                          {selectedClient.phone && <div className="text-sm text-ink-muted">{selectedClient.phone}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-ink-muted">{t('debt.balance')}</div>
                          <div className={cn('text-lg font-bold tabular-nums', selectedClient.balance >= 0 ? 'text-success' : 'text-danger')}>
                            {selectedClient.balance >= 0 ? '+' : '−'}{formatPrice(Math.abs(selectedClient.balance))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>✕</Button>
                      </div>
                    </div>
                  )}

                  {/* Debt amount */}
                  {selectedClient && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t('debt.title')}</label>
                      <Input type="number" className="text-xl h-12 text-right tabular-nums" value={debtAmountStr} onChange={(e) => setDebtAmountStr(e.target.value)} />
                      {debtCashRemain > 0 && (
                        <div className="mt-2 text-sm text-ink-muted">
                          {t('payment.cash')}: {formatPrice(debtCashRemain)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-14 text-xl mt-4"
                  disabled={!selectedClient || debtAmount <= 0}
                  onClick={() => processPayment(debtCashRemain, 0, debtAmount, selectedClient?.id || null)}
                >
                  {t('payment.submit')}
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
