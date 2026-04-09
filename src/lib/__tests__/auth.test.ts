import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
// vi.mock is hoisted — all factory code runs before module imports.
// Factory must be self-contained (no references to outer variables).

vi.mock('applesauce-signers', () => {
	// Use regular function constructors (not arrow functions) — required for `new` to work
	function MockExtensionSigner(this: any) {
		this.getPublicKey = vi.fn().mockResolvedValue('aabbccdd');
	}

	function MockNostrConnectSigner(this: any) {
		this.getPublicKey = vi.fn().mockResolvedValue('ddeeff00');
		this.getNostrConnectURI = vi.fn().mockReturnValue('nostrconnect://mock');
		this.close = vi.fn();
	}
	// static method — attached before export
	(MockNostrConnectSigner as any).fromBunkerURI = vi.fn().mockResolvedValue({
		getPublicKey: vi.fn().mockResolvedValue('112233aa'),
		close: vi.fn(),
	});

	return {
		ExtensionSigner: MockExtensionSigner,
		NostrConnectSigner: MockNostrConnectSigner,
	};
});

vi.mock('$lib/nostr/store', () => ({
	pool: { req: vi.fn(), publish: vi.fn() },
}));

vi.mock('$lib/nostr/bootstrap', () => ({
	parseNpubFromHostname: vi.fn().mockReturnValue({ npub: 'npub1test', pubkey: 'aabbccdd' }),
}));

// Imports after mocks
import {
	loginWithExtension,
	loginWithBunker,
	logout,
	restoreSession,
	getSignerPubkey,
	getSigner,
} from '$lib/auth.svelte';

import { NostrConnectSigner } from 'applesauce-signers';

// Reset state before each test
beforeEach(() => {
	localStorage.clear();
	// logout() resets signerPubkey and signer to null
	logout();
	// Reset fromBunkerURI to default (in case a test overrode it)
	vi.mocked(NostrConnectSigner.fromBunkerURI).mockResolvedValue({
		getPublicKey: vi.fn().mockResolvedValue('112233aa'),
		close: vi.fn(),
	} as any);
});

// --- NIP-07 (AUTH-01) ---

describe('auth singleton — NIP-07 (AUTH-01)', () => {
	it('loginWithExtension calls getPublicKey and sets signerPubkey', async () => {
		await loginWithExtension();
		expect(getSignerPubkey()).toBe('aabbccdd');
	});

	it('loginWithExtension persists auth:type=nip07 to localStorage', async () => {
		await loginWithExtension();
		expect(localStorage.getItem('auth:type')).toBe('nip07');
	});

	it('loginWithExtension sets a non-null signer', async () => {
		await loginWithExtension();
		expect(getSigner()).not.toBeNull();
	});
});

// --- NIP-46 bunker paste (AUTH-02) ---

describe('auth singleton — NIP-46 bunker paste (AUTH-02)', () => {
	it('loginWithBunker calls NostrConnectSigner.fromBunkerURI with given URI', async () => {
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		expect(vi.mocked(NostrConnectSigner.fromBunkerURI)).toHaveBeenCalledWith(
			'bunker://aabbccdd?relay=wss://bucket.coracle.social',
			expect.any(Object)
		);
	});

	it('loginWithBunker sets signerPubkey from getPublicKey(), NOT from bunker URI pubkey', async () => {
		// bunker URI contains 'aabbccdd' but getPublicKey returns '112233aa'
		// signerPubkey must be '112233aa' — verifies we call signer.getPublicKey, not parse URI
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		expect(getSignerPubkey()).toBe('112233aa');
		expect(getSignerPubkey()).not.toBe('aabbccdd');
	});

	it('loginWithBunker persists auth:type=nip46 to localStorage', async () => {
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		expect(localStorage.getItem('auth:type')).toBe('nip46');
	});

	it('loginWithBunker persists bunker_uri to localStorage', async () => {
		const uri = 'bunker://aabbccdd?relay=wss://bucket.coracle.social';
		await loginWithBunker(uri);
		expect(localStorage.getItem('auth:bunker_uri')).toBe(uri);
	});
});

// --- Session persistence (AUTH-06) ---

describe('auth singleton — session persistence (AUTH-06)', () => {
	it('restoreSession with type=nip07 creates ExtensionSigner and sets signerPubkey', async () => {
		localStorage.setItem('auth:type', 'nip07');
		await restoreSession();
		expect(getSignerPubkey()).toBe('aabbccdd');
	});

	it('restoreSession with type=nip46 calls fromBunkerURI and sets signerPubkey', async () => {
		localStorage.setItem('auth:type', 'nip46');
		localStorage.setItem('auth:bunker_uri', 'bunker://remote?relay=wss://bucket.coracle.social');
		localStorage.setItem('auth:relay', 'wss://bucket.coracle.social');
		await restoreSession();
		expect(getSignerPubkey()).toBe('112233aa');
	});

	it('restoreSession with missing bunker_uri clears localStorage silently', async () => {
		localStorage.setItem('auth:type', 'nip46');
		// intentionally omit auth:bunker_uri
		await restoreSession();
		expect(getSignerPubkey()).toBeNull();
		expect(localStorage.getItem('auth:type')).toBeNull();
	});

	it('restoreSession does nothing when auth:type is absent', async () => {
		await restoreSession();
		expect(getSignerPubkey()).toBeNull();
	});

	it('restoreSession clears localStorage when signer connection fails', async () => {
		vi.mocked(NostrConnectSigner.fromBunkerURI).mockRejectedValueOnce(new Error('connection failed'));
		localStorage.setItem('auth:type', 'nip46');
		localStorage.setItem('auth:bunker_uri', 'bunker://remote?relay=wss://bucket.coracle.social');
		localStorage.setItem('auth:relay', 'wss://bucket.coracle.social');
		await restoreSession();
		expect(getSignerPubkey()).toBeNull();
		expect(localStorage.getItem('auth:type')).toBeNull();
	});
});

// --- Logout (AUTH-07) ---

describe('auth singleton — logout (AUTH-07)', () => {
	it('logout sets signerPubkey to null after loginWithExtension', async () => {
		await loginWithExtension();
		expect(getSignerPubkey()).toBe('aabbccdd');
		logout();
		expect(getSignerPubkey()).toBeNull();
	});

	it('logout removes auth:type from localStorage', async () => {
		await loginWithExtension();
		logout();
		expect(localStorage.getItem('auth:type')).toBeNull();
	});

	it('logout removes auth:bunker_uri from localStorage', async () => {
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		logout();
		expect(localStorage.getItem('auth:bunker_uri')).toBeNull();
	});

	it('logout removes auth:relay from localStorage', async () => {
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		logout();
		expect(localStorage.getItem('auth:relay')).toBeNull();
	});

	it('logout calls signer.close() on NIP-46 signer', async () => {
		const mockClose = vi.fn();
		// Return a real instance of the mock constructor so instanceof check passes
		const instance = new (NostrConnectSigner as any)();
		instance.getPublicKey = vi.fn().mockResolvedValue('112233aa');
		instance.close = mockClose;
		vi.mocked(NostrConnectSigner.fromBunkerURI).mockResolvedValueOnce(instance);
		await loginWithBunker('bunker://aabbccdd?relay=wss://bucket.coracle.social');
		logout();
		expect(mockClose).toHaveBeenCalledOnce();
	});
});

// --- isOwner note ---
// isOwner() is a function returning a $derived Svelte 5 rune value.
// It computes: signerPubkey !== null && signerPubkey === parseNpubFromHostname(hostname)?.pubkey
// In unit tests without a Svelte component tree the derived computation runs synchronously,
// but full reactivity tracking isn't available. isOwner() is covered in the manual
// test checklist in .planning/phases/01-auth/01-VALIDATION.md.
