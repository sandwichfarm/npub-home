import { ExtensionSigner, NostrConnectSigner } from 'applesauce-signers';
import { parseNpubFromHostname } from '$lib/nostr/bootstrap';
import { pool } from '$lib/nostr/store';

// --- localStorage keys ---
const KEY_TYPE = 'auth:type';
const KEY_BUNKER_URI = 'auth:bunker_uri';
const KEY_RELAY = 'auth:relay';

const DEFAULT_RELAY = 'wss://bucket.coracle.social';

// --- Reactive state (Svelte 5 .svelte.ts runes) ---
let signer = $state<ExtensionSigner | NostrConnectSigner | null>(null);
let signerPubkey = $state<string | null>(null);

// --- Derived ---
// Guard with typeof window !== 'undefined' per RESEARCH.md Pitfall 3
// NOTE: Svelte 5 does not allow exporting $derived directly from .svelte.ts modules —
// must export a getter function. Components call isOwner() as a function.
const _isOwner = $derived(
	signerPubkey !== null &&
		typeof window !== 'undefined' &&
		signerPubkey === parseNpubFromHostname(window.location.hostname)?.pubkey
);

/** Returns whether the logged-in signer pubkey matches the site's owner pubkey */
export function isOwner(): boolean {
	return _isOwner;
}

// --- Pool adapter helpers ---
// TODO: verify type compat with applesauce-signers NostrSubscriptionMethod
// pool.req returns Observable<SubscriptionResponse> which is Observable<NostrEvent | "EOSE">
// NostrSubscriptionMethod expects (relays: string[], filters: Filter[]) => ObservableInput<NostrEvent | string>
// These are compatible at runtime — the cast suppresses TypeScript's structural check
function poolMethods() {
	return {
		subscriptionMethod: (relays: string[], filters: object[]) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			pool.req(relays, filters as any) as any,
		publishMethod: (relays: string[], event: object) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			pool.publish(relays, event as any) as any,
	};
}

// --- localStorage helpers ---
function persistNip07(): void {
	localStorage.setItem(KEY_TYPE, 'nip07');
}

function persistNip46(bunkerUri: string, relay: string): void {
	localStorage.setItem(KEY_TYPE, 'nip46');
	localStorage.setItem(KEY_BUNKER_URI, bunkerUri);
	localStorage.setItem(KEY_RELAY, relay);
}

function clearPersistedSession(): void {
	localStorage.removeItem(KEY_TYPE);
	localStorage.removeItem(KEY_BUNKER_URI);
	localStorage.removeItem(KEY_RELAY);
}

// --- Public API ---

/** Returns the current signer instance (for signing operations in Phase 2/3) */
export function getSigner(): ExtensionSigner | NostrConnectSigner | null {
	return signer;
}

/** Returns the current signer's pubkey (hex) or null if not logged in */
export function getSignerPubkey(): string | null {
	return signerPubkey;
}

/**
 * NIP-07: Log in via browser extension (window.nostr).
 * Throws ExtensionMissingError if no extension is detected.
 */
export async function loginWithExtension(): Promise<void> {
	const s = new ExtensionSigner();
	const pubkey = await s.getPublicKey();
	signer = s;
	signerPubkey = pubkey;
	persistNip07();
}

/**
 * NIP-46: Log in by pasting a bunker:// URI.
 * CRITICAL: calls getPublicKey() on the resolved signer — NEVER uses the URI pubkey.
 * The URI pubkey is the remote signer's key, not the user's signing key.
 */
export async function loginWithBunker(uri: string): Promise<void> {
	const s = await NostrConnectSigner.fromBunkerURI(uri, poolMethods());
	// CRITICAL: use getPublicKey() — NEVER use the URI pubkey (it is the remote signer's key)
	const pubkey = await s.getPublicKey();
	signer = s;
	signerPubkey = pubkey;
	// Extract relay from bunker URI for persistence
	let relay = DEFAULT_RELAY;
	try {
		const url = new URL(uri.replace('bunker://', 'https://'));
		const relayParam = url.searchParams.get('relay');
		if (relayParam) relay = relayParam;
	} catch {
		// ignore parse errors — use default relay
	}
	persistNip46(uri, relay);
}

/**
 * NIP-46: Create a NostrConnectSigner for QR display flow (Plan 03).
 * Does NOT call getPublicKey. The component awaits getPublicKey() after QR scan.
 * Returns the signer instance for Plan 03's RemoteSignerTab to use.
 */
export function createNostrConnectSigner(relayUrl: string = DEFAULT_RELAY): NostrConnectSigner {
	return new NostrConnectSigner({
		relays: [relayUrl],
		...poolMethods(),
	});
}

/**
 * NIP-46: Finalize QR flow login after remote signer approval.
 * Called by RemoteSignerTab after the remote signer connects.
 * signer must be the same NostrConnectSigner instance that generated the QR URI.
 */
export async function finishNostrConnectLogin(
	s: NostrConnectSigner,
	relayUrl: string
): Promise<void> {
	const pubkey = await s.getPublicKey();
	signer = s;
	signerPubkey = pubkey;
	// We don't have the original bunker URI in QR flow — synthesize a reconnect URI
	const fakeUri = `bunker://${pubkey}?relay=${encodeURIComponent(relayUrl)}`;
	persistNip46(fakeUri, relayUrl);
}

/**
 * Restore session from localStorage.
 * Silently clears stored state on any error — no throws, no UI effect.
 * Called once at app boot from +page.svelte.
 */
export async function restoreSession(): Promise<void> {
	const type = localStorage.getItem(KEY_TYPE);
	if (!type) return;
	try {
		if (type === 'nip07') {
			const s = new ExtensionSigner();
			const pubkey = await s.getPublicKey();
			signer = s;
			signerPubkey = pubkey;
		} else if (type === 'nip46') {
			const uri = localStorage.getItem(KEY_BUNKER_URI);
			const relay = localStorage.getItem(KEY_RELAY) ?? DEFAULT_RELAY;
			if (!uri) throw new Error('missing bunker uri');
			const s = await NostrConnectSigner.fromBunkerURI(uri, poolMethods());
			const pubkey = await s.getPublicKey();
			signer = s;
			signerPubkey = pubkey;
		}
	} catch (err) {
		// Silent fallback: clear storage, stay logged out (per RESEARCH.md Pitfall 2)
		console.warn('[auth] restoreSession failed, clearing stored session:', err);
		clearPersistedSession();
		signer = null;
		signerPubkey = null;
	}
}

/**
 * Log out the current user.
 * Closes NIP-46 connection if active, clears all auth state and localStorage.
 */
export function logout(): void {
	if (signer instanceof NostrConnectSigner) {
		signer.close();
	}
	signer = null;
	signerPubkey = null;
	clearPersistedSession();
}
