import { useI18n } from '../i18n';

/** One guided-mission tip at a time. Short sentences, no wall of text. */
export default function Coach({ step, onNext, onSkip }: { step: string; onNext: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <div className="coach" role="status" aria-live="polite">
      <span className="coach-icon" aria-hidden>🧑‍🚀</span>
      <p>{t(`tutorial.steps.${step}`)}</p>
      <div className="coach-actions">
        <button type="button" className="btn small primary" onClick={onNext}>
          {t('tutorial.next')}
        </button>
        <button type="button" className="btn small ghost" onClick={onSkip}>
          {t('tutorial.skip')}
        </button>
      </div>
    </div>
  );
}
