/* Fixture interactivity: modal toggle + deterministic event log. */
(function initFixture() {
  const log = document.getElementById('fixture-log');
  function record(message) {
    if (log) log.textContent += `${message}\n`;
  }
  const modal = getElement('modal');
  function getElement(id) {
    return document.getElementById(id);
  }
  const open = getElement('open-modal');
  const close = getElement('close-modal');
  if (open && modal instanceof HTMLDialogElement) {
    open.addEventListener('click', () => modal.showModal());
  }
  if (close && modal instanceof HTMLDialogElement) {
    close.addEventListener('click', () => modal.close());
  }
  const noop = getElement('noop-button');
  if (noop) noop.addEventListener('click', () => record('noop clicked'));
  const destructive = getElement('destructive-button');
  if (destructive) {
    destructive.addEventListener('click', () => {
      // The audit engine must never trigger this automatically (FR-06).
      record('DESTRUCTIVE RUN — if you see this from an automated audit, that is a bug');
    });
  }
  record('fixture loaded');
})();
