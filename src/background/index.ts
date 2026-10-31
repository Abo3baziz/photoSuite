import { handleMessageFromPanel } from './messaging/router';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) =>
    console.error('[web-ui-auditor] failed to set side panel behavior', error),
  );

chrome.runtime.onMessage.addListener(
  (message: unknown, sender: chrome.runtime.MessageSender, sendResponse) => {
    const obj = message as { type?: unknown };
    if (typeof obj?.type === 'string' && obj.type.startsWith('content:')) {
      // Content-script → background channel (best-effort; never block the page).
      if (obj.type === 'content:spaNavigation') {
        // Recorded for future route-graph edge attribution; M2 keeps it lightweight.
        void sender;
      }
      sendResponse({ ok: true });
      return false;
    }

    void handleMessageFromPanel(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error('[web-ui-auditor] unhandled message error', error);
        sendResponse({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected background error occurred.' },
        });
      });
    return true;
  },
);
