/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28T19:45:12-04:00
 * PURPOSE: Device ID generation and persistence for anonymous user tracking.
 *          Creates persistent device identifiers stored in localStorage for
 *          anonymous user credit tracking and session management.
 * SRP/DRY check: Pass - Single responsibility (device identification)
 * shadcn/ui: Pass - Utility function, no UI components
 */

const DEVICE_ID_KEY = 'modelcompare_device_id';

/**
 * Generate a new random device ID using crypto.randomUUID()
 * Falls back to timestamp-based ID if crypto is not available
 */
function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2);
}

/**
 * Get the current device ID from localStorage
 * Creates and stores a new ID if none exists
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    // Handle localStorage access errors (private browsing, etc.)
    console.warn('Failed to access localStorage for device ID, using session-only ID:', error);
    return generateDeviceId();
  }
}

/**
 * Set a specific device ID (useful for testing or account merging)
 */
export function setDeviceId(id: string): void {
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch (error) {
    console.warn('Failed to store device ID in localStorage:', error);
  }
}

/**
 * Clear the stored device ID (will generate a new one on next getDeviceId call)
 */
export function clearDeviceId(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear device ID from localStorage:', error);
  }
}

/**
 * Check if a device ID is currently stored
 */
export function hasDeviceId(): boolean {
  try {
    return localStorage.getItem(DEVICE_ID_KEY) !== null;
  } catch (error) {
    return false;
  }
}