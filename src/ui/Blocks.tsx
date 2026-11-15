import { useI18n } from '../i18n';
import { play } from './sound';

export interface BlockRow {
  key: string;
  label: string;
  icon: string;
  value: number; // blocks assigned
  need: number | null; // blocks needed to fully cover, null = not applicable
  disabled?: boolean;
  disabledNote?: string;
}

interface Props {
  id: string;
  title: string;
  help: string;
  total: number;
  rows: BlockRow[];
  onChange: (key: string, value: number) => void;
  locked?: boolean;
}

/**
 * Split a fixed number of blocks between rows. Kid-friendly: tap + and −,
 * and the "need" marker shows how many blocks a system needs to run fully.
 */
export default function Blocks({ id, title, help, total, rows, onChange, locked }: Props) {
  const { t, n } = useI18n();
  const used = rows.reduce((a, r) => a + r.value, 0);
  const free = total - used;
  return (
    <section className="panel blocks" id={id} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <p className="help">{help}</p>
      </header>
      <div className="pool" aria-label={`${n(free)} / ${n(total)}`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`pool-dot ${i < used ? 'used' : ''}`} />
        ))}
      </div>
      {rows.map((r) => {
        const short = r.need !== null && r.need > total; // even every block is not enough
        const ok = r.need === null || (!short && r.value >= r.need);
        return (
          <div key={r.key} className={`block-row ${r.disabled ? 'disabled' : ''}`}>
            <span className="row-icon" aria-hidden>{r.icon}</span>
            <span className="row-label">
              {r.label}
              {r.disabled ? (
                <small className="row-note">{r.disabledNote}</small>
              ) : r.need !== null ? (
                <small className={`row-note ${ok ? 'good' : 'bad'}`}>
                  {short ? t('plan.short') : `${t('plan.need', { n: r.need })} · ${ok ? t('plan.enough') : t('plan.notEnough')}`}
                </small>
              ) : null}
            </span>
            <button
              type="button"
              className="step"
              aria-label={`− ${r.label}`}
              disabled={locked || r.disabled || r.value <= 0}
              onClick={() => {
                play('click');
                onChange(r.key, r.value - 1);
              }}
            >
              −
            </button>
            <span className="row-blocks" aria-live="polite">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`blk ${i < r.value ? 'on' : ''} ${r.need !== null && i === r.need - 1 ? 'need-mark' : ''}`}
                />
              ))}
            </span>
            <button
              type="button"
              className="step"
              aria-label={`+ ${r.label}`}
              disabled={locked || r.disabled || free <= 0}
              onClick={() => {
                play('click');
                onChange(r.key, r.value + 1);
              }}
            >
              +
            </button>
          </div>
        );
      })}
    </section>
  );
}
