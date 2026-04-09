import { describe, it } from 'vitest';

// auth.svelte.ts does not exist yet — these stubs will be filled in during Plan 02
// All tests use it.todo to pass without implementation

describe('auth singleton — NIP-07 (AUTH-01)', () => {
	it.todo('loginWithExtension calls window.nostr.getPublicKey');
	it.todo('loginWithExtension sets signerPubkey to the returned pubkey');
	it.todo('loginWithExtension throws when window.nostr is absent');
});

describe('auth singleton — NIP-46 bunker paste (AUTH-02)', () => {
	it.todo('loginWithBunker calls NostrConnectSigner.fromBunkerURI with the given uri');
	it.todo('loginWithBunker sets signerPubkey from signer.getPublicKey(), not bunker URI pubkey');
	it.todo('loginWithBunker throws on invalid bunker URI');
});

describe('auth singleton — NIP-46 QR URI (AUTH-03)', () => {
	it.todo('getNostrConnectURI returns a string starting with nostrconnect://');
});

describe('auth singleton — owner detection (AUTH-05)', () => {
	it.todo('isOwner is true when signerPubkey equals parsedHost.pubkey');
	it.todo('isOwner is false when signerPubkey does not match parsedHost.pubkey');
	it.todo('isOwner is false when signerPubkey is null');
});

describe('auth singleton — session persistence (AUTH-06)', () => {
	it.todo('restoreSession reads auth:type from localStorage');
	it.todo('restoreSession with type=nip07 recreates ExtensionSigner and sets signerPubkey');
	it.todo('restoreSession with type=nip46 calls fromBunkerURI and sets signerPubkey');
	it.todo('restoreSession on error clears localStorage and stays logged out');
});

describe('auth singleton — logout (AUTH-07)', () => {
	it.todo('logout sets signerPubkey to null');
	it.todo('logout removes auth:type from localStorage');
	it.todo('logout removes auth:bunker_uri from localStorage');
});
