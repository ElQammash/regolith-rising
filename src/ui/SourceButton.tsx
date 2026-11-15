import { useEffect, useRef, useState } from 'react';
import { NASA, type DataEntry, type NasaKey } from '../data/nasa';
import { useI18n } from '../i18n';

/** Small "source" button that reveals where numbers come from, and how honest they are. */
export default function SourceButton({ keys, label, game }: { keys: NasaKey[]; label?: string; game?: string }) {
  const { t, n } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (keys.length === 0 && !game) return null;
  return (
    <>
      <button
        type="button"
        className="source-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${t('common.source')}${label ? `: ${label}` : ''}`}
      >
        {t('common.source')}
      </button>
      <dialog ref={ref} className="source-dialog" onClose={() => setOpen(false)} onClick={(e) => e.target === ref.current && setOpen(false)}>
        <h3>{t('source.title')}</h3>
        {game && (
          <section className="source-entry">
            <div className="badges">
              <span className="badge warn">{t('common.gameValue')}</span>
            </div>
            <p>{t(game)}</p>
          </section>
        )}
        {keys.map((k) => {
          const e = NASA[k] as DataEntry;
          return (
            <section key={k} className="source-entry">
              <p className="source-value">
                <strong>{n(e.value, 3)}</strong> <span dir="ltr">{e.unit}</span>
              </p>
              <div className="badges">
                {e.simplified && <span className="badge warn">{t('source.simplified')}</span>}
                {!e.nasa && <span className="badge alert">{t('source.notNasa')}</span>}
                <span className="badge">{t(`source.${e.verification}`)}</span>
              </div>
              <p className="source-name" dir="ltr">{e.sourceName}</p>
              {e.note && <p className="source-note" dir="ltr">{e.note}</p>}
              <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                {t('source.open')} ↗
              </a>
            </section>
          );
        })}
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          {t('common.close')}
        </button>
      </dialog>
    </>
  );
}
