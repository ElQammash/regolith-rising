import { useState } from 'react';
import { useI18n } from '../i18n';
import { currentUser, fetchSave, login, logout, pushSave, register } from './cloud';
import type { SaveBlob } from './storage';

interface Props {
  save: SaveBlob;
  onBack: () => void;
  onLoaded: (blob: SaveBlob) => void;
}

export default function AccountPanel({ save, onBack, onLoaded }: Props) {
  const { t } = useI18n();
  const [user, setUser] = useState(currentUser());
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const afterLogin = async () => {
    // Newest save wins: cloud copy if it is newer than this device's.
    const remote = await fetchSave().catch(() => null);
    if (remote && remote.updatedAt > save.updatedAt) onLoaded({ ...remote, settings: { ...remote.settings, lang: save.settings.lang } });
    else await pushSave(save);
    setMsg(t('account.synced'));
  };

  const go = async (kind: 'login' | 'register') => {
    setBusy(true);
    setMsg(null);
    try {
      const u = kind === 'login' ? await login(name.trim(), pass) : await register(name.trim(), pass);
      setUser(u);
      setPass('');
      await afterLogin();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(/fetch|network|JSON|HTTP 404/i.test(m) ? t('account.unavailable') : t('account.error', { msg: m }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen account">
      <header className="topbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <h1>☁ {t('account.title')}</h1>
      </header>
      <section className="panel">
        <p>{t('account.intro')}</p>
        {user ? (
          <>
            <p>
              <strong>{t('account.loggedIn', { name: user.username })}</strong>
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                logout();
                setUser(null);
              }}
            >
              {t('account.logout')}
            </button>
          </>
        ) : (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void go('login');
            }}
          >
            <label>
              {t('account.username')}
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_\-]+" required dir="ltr" />
            </label>
            <label>
              {t('account.password')}
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" minLength={6} required dir="ltr" />
            </label>
            <div className="row-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {t('account.login')}
              </button>
              <button type="button" className="btn" disabled={busy || name.length < 3 || pass.length < 6} onClick={() => void go('register')}>
                {t('account.register')}
              </button>
            </div>
          </form>
        )}
        {msg && <p className="msg">{msg}</p>}
        {!user && <p className="help">{t('account.offline')}</p>}
      </section>
    </div>
  );
}
