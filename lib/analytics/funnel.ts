/**
 * The funnel we report on, and the two rules that make the numbers mean something.
 *
 * 1. A step is counted in **distinct sessions**. Eleven previews in the live data were eleven page
 *    loads, not eleven customers; a reload, a retry and a bfcache restore are the same person.
 * 2. "The picture was generated" and "the customer saw the picture" are different steps. Until
 *    2026-09-12 only the first existed, which is why the reports could say ten people looked at a
 *    finished photograph when nothing on the page had been in front of anyone's eyes.
 *
 * Every name here is an event that is actually written somewhere. Steps we cannot observe are left
 * out rather than approximated — see HANDOFF.md for the holes that remain.
 */
export const FUNNEL_STEPS = [
  'PageView',          // the landing page was opened
  'FlowOpened',        // the upload sheet was opened
  'UploadStarted',     // a file was picked
  'ProcessingStarted', // the file is in the bucket and the restoration was accepted
  'PreviewShown',      // the job finished (server-side; says nothing about eyes)
  'PreviewViewed',     // the restored picture was loaded and visible in the viewport
  'ProductSelected',   // digital or framed, size, frame
  'CheckoutClicked',   // the buy button was pressed
  'InitiateCheckout',  // a payment session exists
  'Purchase',          // the provider confirmed the payment
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export type FunnelRow = {
  step: FunnelStep;
  /** distinct sessions that reached this step */
  sessions: number;
  /** sessions lost since the step above (0 on the first row, and never negative) */
  lost: number;
};

/**
 * Counts distinct sessions per step, in funnel order, with the drop to each step beside it.
 * Input is whatever the events table hands back; unknown names and sessionless rows are ignored.
 */
export function funnel(events: { name: string; session_id: string | null }[]): FunnelRow[] {
  const seen = new Map<FunnelStep, Set<string>>();
  for (const step of FUNNEL_STEPS) seen.set(step, new Set());
  for (const e of events) {
    const bucket = seen.get(e.name as FunnelStep);
    if (!bucket || !e.session_id) continue;
    bucket.add(e.session_id);
  }
  let previous: number | null = null;
  return FUNNEL_STEPS.map((step) => {
    const sessions = seen.get(step)!.size;
    const lost = previous === null ? 0 : Math.max(0, previous - sessions);
    previous = sessions;
    return { step, sessions, lost };
  });
}

type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** A sitting: a reload, a Back from the payment page or a second tab is the same look at the picture. */
export const REOPEN_AFTER_MS = 30 * 60_000;

/**
 * Is this the first time this order's picture has been in front of this browser, a later return, or
 * the same sitting as a moment ago?
 *
 * "first"  → the customer saw their result (the step the funnel was missing)
 * "again"  → they came back to it later, from a saved link or a second visit
 * "same"   → a reload or a Back within the half hour: log nothing, or one customer becomes four
 *
 * The marker lives in the browser, so a saved link opened on another device counts as "first" there
 * too. That is a known and deliberate over-count of one per device; the alternative is a server-side
 * view table keyed on a session we do not always have.
 */
export function viewKind(store: KeyValueStore | null | undefined, key: string, now = Date.now()): 'first' | 'again' | 'same' {
  if (!store) return 'first';
  try {
    const previous = Number(store.getItem(key) ?? 0);
    if (previous && now - previous < REOPEN_AFTER_MS) return 'same';
    store.setItem(key, String(now));
    return previous ? 'again' : 'first';
  } catch {
    return 'first';
  }
}

/**
 * True the first time this key is claimed, false afterwards. Used to keep one page from logging the
 * same step twice — an IntersectionObserver fires whenever the picture crosses the edge, and React
 * effects can run twice in development.
 *
 * A browser that refuses storage (private mode, a locked-down in-app browser) gets `true` every
 * time: an unmeasurable visit must still be a working visit, and over-counting one step is a much
 * smaller lie than a page that throws on a customer who cannot be tracked.
 */
export function claimOnce(store: KeyValueStore | null | undefined, key: string): boolean {
  if (!store) return true;
  try {
    if (store.getItem(key)) return false;
    store.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}
