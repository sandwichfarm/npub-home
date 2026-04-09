import { filter } from 'rxjs';
import type { NostrEvent } from 'nostr-tools';
import { eventStore, pool } from './store';
import { BOOTSTRAP_RELAYS, type ParsedHost } from './bootstrap';
import { cacheEvent, loadCachedEvents } from './cache';

export interface NsiteVersion {
	id: string;
	createdAt: number;
	title?: string;
	description?: string;
}

export interface NsiteEntry {
	ref: string;
	slug?: string;
	isRoot: boolean;
	createdAt: number;
	title?: string;
	description?: string;
	versions: NsiteVersion[];
	sourceEvent?: NostrEvent;
}

let activePubkey: string | undefined;

function addToStore(msg: NostrEvent | 'EOSE') {
	if (msg !== 'EOSE') {
		if (!activePubkey) activePubkey = msg.pubkey;
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

function siteRef(kind: 15128 | 35128, pubkey: string, slug?: string): string {
	return `${kind}:${pubkey}:${slug ?? ''}`;
}

function manifestRef(event: NostrEvent): string | null {
	if (event.kind === 15128) return siteRef(15128, event.pubkey);
	if (event.kind === 35128) {
		const slug = event.tags.find((t) => t[0] === 'd')?.[1];
		return slug ? siteRef(35128, event.pubkey, slug) : null;
	}
	return null;
}

function snapshotParentRef(event: NostrEvent): string | null {
	if (event.kind !== 5128) return null;
	return event.tags.find((t) => t[0] === 'a')?.[1] ?? null;
}

function buildAuthorFilters(pubkey: string) {
	return [
		{ kinds: [10002], authors: [pubkey], limit: 5 },
		{ kinds: [0], authors: [pubkey], limit: 1 },
		{ kinds: [35128], authors: [pubkey] },
		{ kinds: [15128], authors: [pubkey] },
		{ kinds: [5128], authors: [pubkey] },
		{ kinds: [16767], authors: [pubkey], limit: 1 }
	];
}

function subscribeToAuthor(pubkey: string) {
	activePubkey = pubkey;

	const bootstrapSub = pool.req(BOOTSTRAP_RELAYS, buildAuthorFilters(pubkey)).subscribe(addToStore);
	const userRelaySubs: Array<{ unsubscribe(): void }> = [];
	const seenRelaySets = new Set<string>();

	const relayDiscoverySub = eventStore
		.filters({ kinds: [10002], authors: [pubkey] })
		.pipe(filter((e): e is NostrEvent => !!e))
		.subscribe((event) => {
			const userRelays = extractRelays(event)
				.filter((r) => !BOOTSTRAP_RELAYS.includes(r))
				.sort();
			if (userRelays.length === 0) return;

			const key = userRelays.join('|');
			if (seenRelaySets.has(key)) return;
			seenRelaySets.add(key);

			userRelaySubs.push(pool.req(userRelays, buildAuthorFilters(pubkey)).subscribe(addToStore));
		});

	return () => {
		bootstrapSub.unsubscribe();
		relayDiscoverySub.unsubscribe();
		for (const sub of userRelaySubs) sub.unsubscribe();
	};
	}

export function subscribe(target: ParsedHost) {
	if (target.type !== 'snapshot') {
		return subscribeToAuthor(target.pubkey);
	}

	activePubkey = undefined;
	const subscriptions: Array<{ unsubscribe(): void }> = [];
	let authorUnsubscribe: (() => void) | null = null;

	subscriptions.push(
		pool.req(BOOTSTRAP_RELAYS, [{ ids: [target.snapshotId], kinds: [5128], limit: 1 }]).subscribe(addToStore)
	);

	const snapshotSub = eventStore
		.filters({ ids: [target.snapshotId], kinds: [5128] })
		.pipe(filter((e): e is NostrEvent => !!e))
		.subscribe((event) => {
			if (authorUnsubscribe) return;
			authorUnsubscribe = subscribeToAuthor(event.pubkey);
		});

	return () => {
		for (const sub of subscriptions) sub.unsubscribe();
		snapshotSub.unsubscribe();
		authorUnsubscribe?.();
	};
}

export function getNsitesFromStore(
	pubkey: string,
	opts: { excludeSlug?: string; includeRoot?: boolean } = {}
): NsiteEntry[] {
	const nsites: NsiteEntry[] = [];
	const snapshots = eventStore
		.getByFilters({ kinds: [5128], authors: [pubkey] })
		.sort((a, b) => b.created_at - a.created_at);
	const versionsByRef = new Map<string, NsiteVersion[]>();

	for (const event of snapshots) {
		const ref = snapshotParentRef(event);
		if (!ref) continue;

		const versions = versionsByRef.get(ref) ?? [];
		versions.push({
			id: event.id,
			createdAt: event.created_at,
			title: event.tags.find((t) => t[0] === 'title')?.[1],
			description: event.tags.find((t) => t[0] === 'description')?.[1]
		});
		versionsByRef.set(ref, versions);
	}

	// Include root site (kind 15128) if requested
	if (opts.includeRoot) {
		const rootEvents = eventStore.getByFilters({ kinds: [15128], authors: [pubkey] });
		if (rootEvents.length > 0) {
			const root = rootEvents.sort((a, b) => b.created_at - a.created_at)[0];
			const ref = manifestRef(root);
			nsites.push({
				ref: ref ?? siteRef(15128, pubkey),
				isRoot: true,
				createdAt: root.created_at,
				title: root.tags.find((t) => t[0] === 'title')?.[1],
				description: root.tags.find((t) => t[0] === 'description')?.[1],
				versions: versionsByRef.get(ref ?? siteRef(15128, pubkey)) ?? [],
				sourceEvent: root
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
			const ref = manifestRef(event);
			nsites.push({
				ref: ref ?? siteRef(35128, pubkey, dTag),
				slug: dTag,
				isRoot: false,
				createdAt: event.created_at,
				title: event.tags.find((t) => t[0] === 'title')?.[1],
				description: event.tags.find((t) => t[0] === 'description')?.[1],
				versions: versionsByRef.get(ref ?? siteRef(35128, pubkey, dTag)) ?? [],
				sourceEvent: event
			});
		}
	}
	return nsites;
}
