'use client';

import { useEffect } from 'react';

/**
 * Browser fingerprint data structure
 */
interface BrowserFingerprint {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  screenResolution: string;
  screenColorDepth: number;
  timezone: string;
  timezoneOffset: number;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  maxTouchPoints: number;
  webglRenderer: string | null;
  webglVendor: string | null;
  canvasFingerprint: string | null;
  audioFingerprint: string | null;
  fontsFingerprint: string | null;
  collectedAt: string;
}

/**
 * Collect browser fingerprint data
 */
function collectFingerprint(): BrowserFingerprint {
  // Get WebGL info
  let webglRenderer: string | null = null;
  let webglVendor: string | null = null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getParameter' in gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
    }
  } catch {
    // WebGL not available
  }

  // Generate canvas fingerprint
  let canvasFingerprint: string | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Fingerprint', 4, 17);
      canvasFingerprint = canvas.toDataURL().slice(-50);
    }
  } catch {
    // Canvas not available
  }

  // Get device memory (if available)
  let deviceMemory: number | null = null;
  if ('deviceMemory' in navigator) {
    deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null;
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...navigator.languages],
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    screenColorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    webglRenderer,
    webglVendor,
    canvasFingerprint,
    audioFingerprint: null, // Audio fingerprinting is complex and often blocked
    fontsFingerprint: null, // Font enumeration is blocked in most modern browsers
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Submit fingerprint to the API
 */
async function submitFingerprint(fingerprint: BrowserFingerprint): Promise<boolean> {
  try {
    const response = await fetch('/api/user/fingerprint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fingerprint }),
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to submit fingerprint:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('[Fingerprint] Collected and stored:', data.collected_at);
    return true;
  } catch (error) {
    console.error('[Fingerprint] Error submitting:', error);
    return false;
  }
}

/**
 * FingerprintCollector Component
 *
 * This component should be placed in the dashboard layout.
 * It collects browser fingerprint data on mount and submits it to the API.
 * The fingerprint is used by the desktop scraper to mimic the user's browser.
 */
export function FingerprintCollector() {
  useEffect(() => {
    // Delay fingerprint collection slightly to not block initial render
    const timeout = setTimeout(async () => {
      try {
        const fingerprint = collectFingerprint();
        await submitFingerprint(fingerprint);
      } catch (error) {
        console.error('[Fingerprint] Collection failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  // This component renders nothing - it only collects fingerprint on mount
  return null;
}
