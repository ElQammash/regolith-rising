import { useCallback, useEffect, useState } from 'react';
import { createMission, retryFromTurn, starsFor, type GameState, type Loadout, type Planet } from './engine';
import { I18nProvider, translate, type Lang } from './i18n';
import Debrief from './ui/Debrief';
import LoadoutScreen, { starterLoadout } from './ui/LoadoutScreen';
import Menu from './ui/Menu';
import PlayScreen from './ui/PlayScreen';
import { setMuted } from './ui/sound';
import { loadLocal, saveLocal, type SaveBlob } from './ui/storage';
import AccountPanel from './ui/AccountPanel';
import { pushSave } from './ui/cloud';

type Screen = 'menu' | 'cargo' | 'play' | 'debrief' | 'account';

export default function App() {
  const [save, setSave] = useState<SaveBlob>(() => loadLocal());
  const [screen, setScreen] = useState<Screen>('menu');
  const [planet, setPlanet] = useState<Planet>('moon');
  const [mission, setMission] = useState<GameState | null>(save.mission);
  const [lastLoadout, setLastLoadout] = useState<Loadout | undefined>(undefined);
  const [tutorial, setTutorial] = useState(false);
  const lang = save.settings.lang;

  useEffect(() => setMuted(save.settings.muted), [save.settings.muted]);

  const persist = useCallback((patch: Partial<SaveBlob>) => {
    setSave((prev) => {
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      saveLocal(next);
      void pushSave(next);
      return next;
    });
  }, []);

  const setSettings = (s: Partial<SaveBlob['settings']>) => persist({ settings: { ...save.settings, ...s } });

  const startCargo = (p: Planet, guided = false) => {
    setPlanet(p);
    setTutorial(guided);
    setLastLoadout(guided ? starterLoadout(p) : lastLoadout && planet === p ? lastLoadout : undefined);
    setScreen('cargo');
  };

  const launch = (l: Loadout) => {
    setLastLoadout(l);
    const m = createMission(planet, l, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
    setMission(m);
    persist({ mission: m });
    setScreen('play');
  };

  const onState = (s: GameState) => {
    setMission(s);
    persist({ mission: s });
  };

  const onFinished = (s: GameState) => {
    setMission(s);
    const stars = starsFor(s);
    const best = { ...save.best, [s.planet]: Math.max(save.best[s.planet], stars) };
    persist({ mission: s, best, settings: { ...save.settings, tutorialDone: true } });
    setTutorial(false);
    setScreen('debrief');
  };

  const content = (() => {
    switch (screen) {
      case 'menu':
        return (
          <Menu
            saved={mission}
            best={save.best}
            tutorialDone={save.settings.tutorialDone}
            onStart={(p) => startCargo(p)}
            onTutorial={() => startCargo('moon', true)}
            onResume={() => mission && (setPlanet(mission.planet), setScreen('play'))}
            onAccount={() => setScreen('account')}
          />
        );
      case 'cargo':
        return <LoadoutScreen key={planet} planet={planet} initial={lastLoadout} onLaunch={launch} onBack={() => setScreen('menu')} tutorial={tutorial} />;
      case 'play':
        return mission ? (
          <PlayScreen
            key={`${mission.seed}-${mission.history.length === 0 ? 'start' : 'run'}`}
            state={mission}
            onState={onState}
            onFinished={onFinished}
            tutorial={tutorial && !save.settings.tutorialDone}
            onTutorialDone={() => setSettings({ tutorialDone: true })}
          />
        ) : null;
      case 'debrief':
        return mission ? (
          <Debrief
            state={mission}
            onRetry={(turn) => {
              const r = retryFromTurn(mission, turn);
              setMission(r);
              persist({ mission: r });
              setScreen('play');
            }}
            onRetryCargo={() => startCargo(mission.planet)}
            onNew={() => {
              setMission(null);
              persist({ mission: null });
              setScreen('menu');
            }}
          />
        ) : null;
      case 'account':
        return <AccountPanel save={save} onBack={() => setScreen('menu')} onLoaded={(blob) => { setSave(blob); saveLocal(blob); setMission(blob.mission); }} />;
    }
  })();

  return (
    <I18nProvider lang={lang}>
      <div className={`app planet-${screen === 'menu' ? 'none' : planet}`}>
        <nav className="appbar">
          <button type="button" className="brand" onClick={() => setScreen('menu')} aria-label={translate(lang, 'common.menu')}>
            🪐 <span>{translate(lang, 'app.title')}</span>
          </button>
          <div className="appbar-actions">
            <button type="button" className="btn small ghost" onClick={() => setSettings({ lang: (lang === 'en' ? 'ar' : 'en') as Lang })} aria-label={translate(lang, 'common.language')}>
              {translate(lang, 'meta.switchTo')}
            </button>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setSettings({ muted: !save.settings.muted })}
              aria-label={translate(lang, save.settings.muted ? 'common.unmute' : 'common.mute')}
              aria-pressed={save.settings.muted}
            >
              {save.settings.muted ? '🔇' : '🔊'}
            </button>
          </div>
        </nav>
        <main>{content}</main>
      </div>
    </I18nProvider>
  );
}
