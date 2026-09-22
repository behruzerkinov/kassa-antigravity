import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/i18nContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Titlebar } from '../components/Titlebar';

export function LoginPage() {
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || t('general.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      <Titlebar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 border border-border rounded-lg bg-surface-raised shadow-sm">
          <h1 className="text-xl font-semibold mb-6 text-center text-ink">{t('login.title')}</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('login.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
            
            <Input
              type="password"
              label={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            {error && (
              <div className="text-sm text-danger">{error}</div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('general.loading') : t('login.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
