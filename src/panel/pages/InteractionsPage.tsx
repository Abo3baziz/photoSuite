import { useEffect, type JSX } from 'react';
import { usePanelStore } from '../panelStore';

export function InteractionsPage(): JSX.Element {
  const session = usePanelStore((s) => s.session);
  const interactions = usePanelStore((s) => s.interactions);
  const refreshInteractions = usePanelStore((s) => s.refreshInteractions);

  useEffect(() => {
    void refreshInteractions();
  }, [refreshInteractions, session?.id]);

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
        <h2 className="card__title">Interactions</h2>
        {interactions.length === 0 ? (
          <p className="muted">No interactions recorded yet.</p>
        ) : (
          <ul className="interaction-list">
            {interactions.map((interaction) => (
              <li key={interaction.id} className="interaction-list__item">
                <span className={`pill pill--${interaction.status === 'succeeded' ? 'connected' : interaction.status === 'failed' ? 'disconnected' : 'connecting'}`}>
                  {interaction.status}
                </span>
                <span className="interaction-list__type">{interaction.actionType}</span>
                <span className="muted">
                  {interaction.durationMs !== null ? `${interaction.durationMs} ms` : '—'}
                  {interaction.skipReason ? ` · skipped: ${interaction.skipReason}` : ''}
                  {interaction.error ? ` · ${interaction.error}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
