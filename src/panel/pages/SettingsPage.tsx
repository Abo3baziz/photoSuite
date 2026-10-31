import { useState, type JSX } from 'react';
import type { Settings } from '../../shared/config/settings';
import { usePanelStore } from '../panelStore';

/**
 * Settings page (Milestone 1): exploration limits, capture behavior, and
 * exclusion lists. All persistence goes through the validated background
 * storage path. Exclusion semantics activate with discovery in Milestone 2.
 */

const LIMIT_FIELDS: ReadonlyArray<{
  key: keyof Settings['exploration'];
  label: string;
  hint?: string;
}> = [
  { key: 'maxRoutes', label: 'Maximum routes' },
  { key: 'maxActions', label: 'Maximum actions' },
  { key: 'maxVisitsPerState', label: 'Max visits per state' },
  { key: 'maxDepth', label: 'Maximum exploration depth' },
  { key: 'actionTimeoutMs', label: 'Action timeout (ms)' },
  { key: 'retryCount', label: 'Retry count' },
  { key: 'sessionTimeoutMs', label: 'Session timeout (ms)' },
];

function toLines(values: readonly string[]): string {
  return values.join('\n');
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function SettingsPage(): JSX.Element {
  const settings = usePanelStore((s) => s.settings);
  const status = usePanelStore((s) => s.settingsStatus);
  const error = usePanelStore((s) => s.error);
  const updateSettings = usePanelStore((s) => s.updateSettings);
  const resetSettings = usePanelStore((s) => s.resetSettings);

  const [routeDraft, setRouteDraft] = useState<string | null>(null);
  const [elementDraft, setElementDraft] = useState<string | null>(null);

  if (settings === null) {
    return (
      <div className="page">
        <p className="muted" aria-live="polite">
          {status === 'saving'
            ? 'Loading settings…'
            : 'Settings are unavailable while the background is unreachable.'}
        </p>
      </div>
    );
  }

  // Drafts reflect unsaved edits; fall back to persisted settings otherwise.
  const routeText = routeDraft ?? toLines(settings.exclusions.routes);
  const elementText = elementDraft ?? toLines(settings.exclusions.elements);

  const handleLimitChange = (key: keyof Settings['exploration'], raw: string): void => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    updateSettings({
      ...settings,
      exploration: { ...settings.exploration, [key]: Math.trunc(value) },
    });
  };

  const handleSave = (): void => {
    const next: Settings = {
      ...settings,
      exclusions: {
        routes: parseLines(routeText),
        elements: parseLines(elementText),
      },
    };
    void updateSettings(next);
  };

  const handleReset = (): void => {
    void resetSettings();
  };

  const statusMessage =
    status === 'saved'
      ? 'Saved.'
      : status === 'reset'
        ? 'Reset to defaults.'
        : status === 'error'
          ? (error?.message ?? 'Save failed.')
          : status === 'saving'
            ? 'Saving…'
            : '';

  return (
    <div className="page">
      <section className="card">
        <h2 className="card__title">Exploration limits</h2>
        <div className="field-grid">
          {LIMIT_FIELDS.map((field) => (
            <label key={String(field.key)} className="field">
              <span className="field__label">{field.label}</span>
              <input
                type="number"
                className="field__input"
                value={String(settings.exploration[field.key])}
                onChange={(event) => handleLimitChange(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="muted">Values outside their allowed ranges are rejected on save.</p>
      </section>

      <section className="card">
        <h2 className="card__title">Screenshots</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.capture.fullPage}
            onChange={(event) =>
              updateSettings({ ...settings, capture: { fullPage: event.target.checked } })
            }
          />
          <span>
            Capture full-page screenshots by scrolling and stitching (fixed elements suppressed
            during capture)
          </span>
        </label>
      </section>

      <section className="card">
        <h2 className="card__title">Exclusions</h2>
        <label className="field">
          <span className="field__label">Excluded route prefixes (one per line)</span>
          <textarea
            className="field__input field__input--area"
            rows={4}
            value={routeText}
            onChange={(event) => setRouteDraft(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Excluded element name fragments (one per line)</span>
          <textarea
            className="field__input field__input--area"
            rows={4}
            value={elementText}
            onChange={(event) => setElementDraft(event.target.value)}
          />
        </label>
        <p className="muted">
          Exclusions persist now and take effect as route and element discovery land (Milestone 2).
        </p>
      </section>

      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={status === 'saving'}
        >
          Save settings
        </button>
        <button type="button" className="btn" onClick={handleReset} disabled={status === 'saving'}>
          Reset to defaults
        </button>
        <span className="muted" role="status">
          {statusMessage}
        </span>
      </div>
    </div>
  );
}
