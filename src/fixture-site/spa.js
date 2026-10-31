/* pushState-based SPA fixture: observable via history/popstate instrumentation. */
(function initSpa() {
  const root = document.getElementById('spa-root');
  function render(view) {
    if (root) root.textContent = `view: ${view}`;
  }
  for (const link of document.querySelectorAll('.spa-link')) {
    if (link instanceof HTMLButtonElement) {
      link.addEventListener('click', () => {
        const view = link.dataset.view ?? 'unknown';
        history.pushState({ view }, '', `?view=${view}`);
        render(view);
      });
    }
  }
  window.addEventListener('popstate', (event) => {
    render(
      event.state && typeof event.state === 'object' && 'view' in event.state
        ? String(event.state.view)
        : 'home',
    );
  });
  render('home');
})();
