import type { NostrEvent } from 'nostr-tools';

const CACHE_KEY_PREFIX = 'nostr-events:';

function cacheKey(pubkey: string): string {
	return CACHE_KEY_PREFIX + pubkey;
}

/** Save an event to the localStorage cache for a given pubkey. */
export function cacheEvent(pubkey: string, event: NostrEvent): void {
	try {
		const existing = loadCachedEvents(pubkey);
		const idx = existing.findIndex(
			(e) => e.id === event.id || (e.kind === event.kind && isReplaceable(e) && replacementKey(e) === replacementKey(event))
		);
		if (idx !== -1) {
			// Keep the newer one
			if (event.created_at > existing[idx].created_at) {
				existing[idx] = event;
			}
		} else {
			existing.push(event);
		}
		localStorage.setItem(cacheKey(pubkey), JSON.stringify(existing));
	} catch {
		// localStorage full or unavailable — silently ignore
	}
}

/** Load all cached events for a pubkey from localStorage. */
export function loadCachedEvents(pubkey: string): NostrEvent[] {
	try {
		const raw = localStorage.getItem(cacheKey(pubkey));
		if (!raw) return [];
		return JSON.parse(raw) as NostrEvent[];
	} catch {
		return [];
	}
}

/** Replaceable event kinds use (kind + pubkey + d-tag) as identity. */
function isReplaceable(event: NostrEvent): boolean {
	const k = event.kind;
	return k === 0 || k === 3 || (k >= 10000 && k < 20000) || (k >= 30000 && k < 40000);
}

function replacementKey(event: NostrEvent): string {
	const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
	return `${event.kind}:${event.pubkey}:${dTag}`;
}
