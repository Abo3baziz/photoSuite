import { type JSX } from 'react';
import { useEffect } from 'react';
import { usePanelStore } from '../panelStore';

export function PagesPage(): JSX.Element {
  const session = usePanelStore((s) => s.session);
  const routes = usePanelStore((s) => s.routes);
  const refreshRoutes = usePanelStore((s) => s.refreshRoutes);

  useEffect(() => {
    void refreshRoutes();
  }, [refreshRoutes, session?.id]);

  if (session === null) {
    return (
      <div className="page">
        <p className="muted">No audit session yet. Start one from the Overview page.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card">
        <h2 className="card__title">Session</h2>
        <dl className="facts">
          <div className="facts__row">
            <dt>Status</dt>
            <dd>{session.status}</dd>
          </div>
          <div className="facts__row">
            <dt>Origin</dt>
            <dd>{session.origin}</dd>
          </div>
          <div className="facts__row">
            <dt>Routes</dt>
            <dd>{routes.length}</dd>
          </div>
        </dl>
      </section>
      <section className="card">
        <h2 className="card__title">Discovered routes</h2>
        {routes.length === 0 ? (
          <p className="muted">No routes discovered yet.</p>
        ) : (
          <ul className="route-list">
            {routes.map((route) => (
              <li key={route.id} className="route-list__item">
                <span
                  className={`pill pill--${route.status === 'visited' ? 'connected' : route.status === 'failed' ? 'disconnected' : 'connecting'}`}
                >
                  {route.status}
                </span>
                <span className="route-list__url">{route.url}</span>
                <span className="muted">
                  depth {route.depth} · {route.discoveredVia}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
