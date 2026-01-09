// Lightweight client-side analytics tracker
// Tracks page views and sessions without PII

const ANALYTICS_ENDPOINT = '/api/analytics/track';
const SESSION_KEY = 'mg_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface PageViewData {
  path: string;
  referrer: string;
  sessionId: string;
  timestamp: number;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
}

// Generate a random session ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get or create session ID from localStorage
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Check if session is still valid (within timeout)
      if (Date.now() - session.lastActivity < SESSION_TIMEOUT) {
        // Update last activity
        session.lastActivity = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session.id;
      }
    }

    // Create new session
    const newSession = {
      id: generateSessionId(),
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSession.id;
  } catch {
    // If localStorage fails, generate temporary session
    return generateSessionId();
  }
}

// Track a page view
export async function trackPageView(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Skip tracking in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Skipping tracking in development');
    return;
  }

  // Skip tracking for bots
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('spider')) {
    return;
  }

  const data: PageViewData = {
    path: window.location.pathname,
    referrer: document.referrer || '',
    sessionId: getSessionId(),
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };

  try {
    // Use sendBeacon for reliability, fall back to fetch
    const payload = JSON.stringify(data);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_ENDPOINT, payload);
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    // Silently fail - analytics shouldn't break the app
  }
}

// Auto-track on page load (for use in layout)
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Track initial page view
  trackPageView();

  // Track on route change (for SPA navigation)
  // This will be called by the Next.js router events
}
