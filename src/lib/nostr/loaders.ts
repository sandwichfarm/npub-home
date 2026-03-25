import { filter } from 'rxjs';
import type { NostrEvent } from 'nostr-tools';
import { eventStore, pool } from './store';
import { BOOTSTRAP_RELAYS } from './bootstrap';
import { cacheEvent, loadCachedEvents } from './cache';

export interface NsiteEntry {
	slug?: string;
	createdAt: number;
	title?: string;
	description?: string;
}

let activePubkey: string | undefined;

function addToStore(msg: NostrEvent | 'EOSE') {
	if (msg !== 'EOSE') {
		eventStore.add(msg);
		if (activePubkey) cacheEvent(activePubkey, msg);
	}
}

/** Hydrate the event store from localStorage for instant rendering. */
export function hydrateFromCache(pubkey: string): void {
	const cached = loadCachedEvents(pubkey);
	for (const event of cached) {
		eventStore.add(event);
	}
}

function extractRelays(event: NostrEvent): string[] {
	return event.tags
		.filter((t) => t[0] === 'r' && t[1]?.startsWith('wss://'))
		.map((t) => t[1].trim());
}

export function subscribe(pubkey: string) {
	activePubkey = pubkey;

	// Query bootstrap relays for everything upfront
	const bootstrapSub = pool
		.req(BOOTSTRAP_RELAYS, [
			{ kinds: [10002], authors: [pubkey], limit: 5 },
			{ kinds: [0], authors: [pubkey], limit: 1 },
			{ kinds: [35128], authors: [pubkey] },
			{ kinds: [15128], authors: [pubkey], limit: 1 },
      { kinds: [16767], authors: [pubkey], limit: 1 }
		])
		.subscribe(addToStore);

	// When relay list events arrive, also query the user's own relays
	const relayDiscoverySub = eventStore
		.filters({ kinds: [10002], authors: [pubkey] })
		.pipe(filter((e): e is NostrEvent => !!e))
		.subscribe((event) => {
			const userRelays = extractRelays(event).filter((r) => !BOOTSTRAP_RELAYS.includes(r));
			if (userRelays.length > 0) {
				pool
					.req(userRelays, [
						{ kinds: [0], authors: [pubkey], limit: 1 },
			      { kinds: [35128], authors: [pubkey] },
			      { kinds: [15128], authors: [pubkey], limit: 1 },
            { kinds: [16767], authors: [pubkey], limit: 1 }
					])
					.subscribe(addToStore);
			}
		});

	return () => {
		bootstrapSub.unsubscribe();
		relayDiscoverySub.unsubscribe();
	};
}

export function getNsitesFromStore(
	pubkey: string,
	opts: { excludeSlug?: string; includeRoot?: boolean } = {}
): NsiteEntry[] {
	const nsites: NsiteEntry[] = [];

	// Include root site (kind 15128) if requested
	if (opts.includeRoot) {
		const rootEvents = eventStore.getByFilters({ kinds: [15128], authors: [pubkey] });
		if (rootEvents.length > 0) {
			const root = rootEvents.sort((a, b) => b.created_at - a.created_at)[0];
			nsites.push({
				createdAt: root.created_at,
				title: root.tags.find((t) => t[0] === 'title')?.[1],
				description: root.tags.find((t) => t[0] === 'description')?.[1]
			});
		}
	}

	// Named sites (kind 35128)
	const events = eventStore.getByFilters({ kinds: [35128], authors: [pubkey] });
	const seen = new Set<string>();
	const sorted = events.sort((a, b) => b.created_at - a.created_at);
	for (const event of sorted) {
		const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
		if (dTag && !seen.has(dTag) && dTag !== opts.excludeSlug) {
			seen.add(dTag);
			nsites.push({
				slug: dTag,
				createdAt: event.created_at,
				title: event.tags.find((t) => t[0] === 'title')?.[1],
				description: event.tags.find((t) => t[0] === 'description')?.[1]
			});
		}
	}
	return nsites;
}
