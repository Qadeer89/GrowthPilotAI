import { RateLimitError } from "./errors";

// In-process sliding-window counter -- deliberately not Redis-backed: this
// app deploys as a single Node process on one VPS (see the deployment
// runbook), so an in-memory map is the real mechanism that will actually run
// in production, not a stand-in for one that doesn't exist yet. If this ever
// deploys across multiple instances, this must move to a shared store first.
const hits = new Map<string, number[]>();

/**
 * Throws RateLimitError once `key` has been hit more than `max` times within
 * `windowMs`. Used to blunt scripted abuse of public, unauthenticated
 * endpoints (e.g. the public lead-capture form) that have no login to rely
 * on for protection.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    throw new RateLimitError("Too many requests. Please try again later.");
  }

  timestamps.push(now);
  hits.set(key, timestamps);
}
