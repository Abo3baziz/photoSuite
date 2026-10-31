import { type JSX } from 'react';
import { usePanelStore } from '../panelStore';

/** Overview (Milestone 1): real active-tab facts only — no placeholder stats. */

function ConnectionPill(): JSX.Element {
  const connection = usePanelStore((s) => s.connection);
  return (
    <span className={`pill pill--${connection}`}>
      {connection === 'connected'
        ? 'Connected to background'
        : connection === 'connecting'
          ? 'Connecting…'
          : 'Background unreachable'}
    </span>
  );
}

function TabCard(): JSX.Element | null {
  const tabInfo = usePanelStore((s) => s.tabInfo);
  const error = usePanelStore((s) => s.error);
  const grantOrigin = usePanelStore((s) => s.grantOrigin);
  const inspect = usePanelStore((s) => s.inspect);
  const inspectBusy = usePanelStore((s) => s.inspectBusy);
  const inspectResult = usePanelStore((s) => s.inspectResult);

  if (tabInfo === null) {
    return (
      <section className="card" aria-live="polite">
        <h2 className="card__title">Current website</h2>
        <p className="muted">
          Unable to reach the background service worker. Reload this panel and try again.
        </p>
      </section>
    );
  }

  if (tabInfo.kind === 'inaccessible' || tabInfo.kind === 'unsupported') {
    return (
      <section className="card">
        <h2 className="card__title">Current website</h2>
        <p className="callout callout--warning" role="status">
          {tabInfo.reason}
        </p>
      </section>
    );
  }

  const { url, origin, title, hasOriginPermission } = tabInfo;

  return (
    <section className="card">
      <h2 className="card__title">Current website</h2>
      <dl className="facts">
        <div className="facts__row">
          <dt>URL</dt>
          <dd className="facts__url" title={url}>
            {url}
          </dd>
        </div>
        <div className="facts__row">
          <dt>Origin</dt>
          <dd>{origin}</dd>
        </div>
        <div className="facts__row">
          <dt>Title</dt>
          <dd>{title === '' ? '(no title)' : title}</dd>
        </div>
        <div className="facts__row">
          <dt>Host access</dt>
          <dd>{hasOriginPermission ? 'granted' : 'not granted'}</dd>
        </div>
      </dl>

      {!hasOriginPermission && (
        <>
          <div className="callout callout--info">
            Granting host access lets the auditor inspect this site and use screenshots. Only
            <strong> {origin}</strong> is requested — never all sites.
          </div>
          <button type="button" className="btn btn--primary" onClick={() => void grantOrigin()}>
            Grant access to {origin}
          </button>
        </>
      )}

      {hasOriginPermission && (
        <>
          <button
            type="button"
            className="btn btn--primary"
            disabled={inspectBusy}
            onClick={() => void inspect()}
          >
            {inspectBusy ? 'Inspecting…' : 'Inspect page'}
          </button>
          {error !== null && (
            <p className="callout callout--warning" role="alert">
              {error.message}
            </p>
          )}
          {inspectResult !== null && (
            <div className="facts">
              <h3 className="facts__caption">Live page inspection</h3>
              <div className="facts__row">
                <dt>Interactive elements</dt>
              </div>
              <div className="facts__row">
                <dt>Links</dt>
                <dd>{inspectResult.counts.links}</dd>
              </div>
              <div className="facts__row">
                <dt>Buttons</dt>
                <dd>{inspectResult.counts.buttons}</dd>
              </div>
              <div className="facts__row">
                <dt>Inputs</dt>
                <dd>{inspectResult.counts.inputs}</dd>
              </div>
              <div className="facts__row">
                <dt>Textareas</dt>
                <dd>{inspectResult.counts.textareas}</dd>
              </div>
              <div className="facts__row">
                <dt>Selects</dt>
                <dd>{inspectResult.counts.selects}</dd>
              </div>
              <div className="facts__row">
                <dt>Open dialogs</dt>
                <dd>{inspectResult.counts.dialogs}</dd>
              </div>
              <div className="facts__row">
                <dt>Viewport</dt>
                <dd>
                  {inspectResult.viewport.width}×{inspectResult.viewport.height} @{' '}
                  {inspectResult.viewport.devicePixelRatio}x
                </dd>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function OverviewPage(): JSX.Element {
  return (
    <div className="page">
      <ConnectionPill />
      <TabCard />
    </div>
  );
}
