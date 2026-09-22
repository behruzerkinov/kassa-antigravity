import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/i18nContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Titlebar } from '../components/Titlebar';

export function LockScreen() {
  const { unlockScreen, cashierName } = useAuthStore();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await unlockScreen(password);
    } catch (err: any) {
      setError(err.message || t('general.error'));
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      <Titlebar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 border border-border rounded-lg bg-surface-raised shadow-sm text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold mb-1 text-ink">{cashierName || 'Cashier'}</h1>
          <p className="text-sm text-ink-muted mb-6">{t('lock.locked')}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              type="password"
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
            
            {error && (
              <div className="text-sm text-danger">{error}</div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('general.loading') : t('lock.unlock')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
