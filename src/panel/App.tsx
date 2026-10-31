import { useEffect, useState, type JSX } from 'react';
import { usePanelStore } from './panelStore';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';

type PageId = 'overview' | 'settings';

const NAV_ITEMS: ReadonlyArray<{ id: PageId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
];

export function App(): JSX.Element {
  const [page, setPage] = useState<PageId>('overview');
  const initialize = usePanelStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Web UI Auditor</h1>
        <nav className="app__nav" aria-label="Audit pages">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app__nav-item${page === item.id ? ' app__nav-item--active' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app__main">{page === 'overview' ? <OverviewPage /> : <SettingsPage />}</main>
    </div>
  );
}
