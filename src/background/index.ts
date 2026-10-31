import { handleMessageFromPanel } from './messaging/router';

/**
 * Background service worker entry (Milestone 1 scope):
 * - register the side panel to open on action-click
 * - route panel messages through the validated dispatcher
 * Session orchestration, discovery, screenshots, and persistence arrive in
 * Milestones 2+ through this same entry point.
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error('[web-ui-auditor] failed to set side panel behavior', error));

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void handleMessageFromPanel(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      console.error('[web-ui-auditor] unhandled message error', error);
      sendResponse({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected background error occurred.' } });
    });
  return true; // keep the message channel open for the async reply
});
