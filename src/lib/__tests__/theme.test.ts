import { describe, it, expect } from 'vitest';
import { parseThemeDefinition, decodeNeventInput } from '$lib/theme';
import type { NostrEvent } from 'nostr-tools';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_ID = 'a'.repeat(64);
// Pre-encoded bech32 strings generated with nostr-tools nip19
const NEVENT_NO_RELAY = 'nevent1qqs242424242424242424242424242424242424242424242424242s7c3tw2';
const NEVENT_WITH_RELAY = 'nevent1qythwumn8ghj7un9d3shjtn90psk6urvv5hxxmmdqqs242424242424242424242424242424242424242424242424242sxemysv';
const NOTE_STR = 'note1424242424242424242424242424242424242424242424242424qv3q9y6';
const NPUB_STR = 'npub1hwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwasxw04hu';
const NADDR_36767 = 'naddr1qvzqqqy0nupzpnxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvqythwumn8ghj7un9d3shjtn90psk6urvv5hxxmmdqqz8getnwsppl074';

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
	return {
		id: 'deadbeef'.repeat(8),
		pubkey: '1234abcd'.repeat(8),
		created_at: 1700000000,
		kind: 36767,
		content: '',
		sig: 'ff'.repeat(32),
		tags: [
			['c', '#1a1b2e', 'background'],
			['c', '#e0e0f0', 'text'],
			['c', '#6c63ff', 'primary'],
		],
		...overrides,
	};
}

// ─── parseThemeDefinition ────────────────────────────────────────────────────

describe('parseThemeDefinition', () => {
	it('returns ActiveProfileTheme for a valid kind 36767 event with c tags', () => {
		const result = parseThemeDefinition(makeEvent());
		expect(result).not.toBeNull();
		expect(result!.colors).toBeDefined();
		expect(result!.colors.background).toBeTruthy();
		expect(result!.colors.text).toBeTruthy();
		expect(result!.colors.primary).toBeTruthy();
	});

	it('returns null for kind 16767 (wrong kind)', () => {
		const result = parseThemeDefinition(makeEvent({ kind: 16767 }));
		expect(result).toBeNull();
	});

	it('returns null for kind 1 (wrong kind)', () => {
		const result = parseThemeDefinition(makeEvent({ kind: 1 }));
		expect(result).toBeNull();
	});

	it('returns null when required c tags are missing', () => {
		const result = parseThemeDefinition(makeEvent({ tags: [] }));
		expect(result).toBeNull();
	});

	it('returns null when only some c tags are present (missing primary)', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
			],
		}));
		expect(result).toBeNull();
	});

	it('populates font field when f tag is present', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
				['c', '#6c63ff', 'primary'],
				['f', 'Inter', 'https://fonts.example.com/inter.woff2'],
			],
		}));
		expect(result).not.toBeNull();
		expect(result!.font).toBeDefined();
		expect(result!.font!.family).toBe('Inter');
		expect(result!.font!.url).toBe('https://fonts.example.com/inter.woff2');
	});

	it('font field is undefined when f tag is absent', () => {
		const result = parseThemeDefinition(makeEvent());
		expect(result).not.toBeNull();
		expect(result!.font).toBeUndefined();
	});

	it('populates background field when bg tag is present', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
				['c', '#6c63ff', 'primary'],
				['bg', 'url https://example.com/bg.jpg', 'mode cover'],
			],
		}));
		expect(result).not.toBeNull();
		expect(result!.background).toBeDefined();
		expect(result!.background!.url).toBe('https://example.com/bg.jpg');
	});

	it('background field is undefined when bg tag is absent', () => {
		const result = parseThemeDefinition(makeEvent());
		expect(result).not.toBeNull();
		expect(result!.background).toBeUndefined();
	});

	it('sanitizes font family: sets font to undefined when family contains semicolons (CSS injection)', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
				['c', '#6c63ff', 'primary'],
				['f', 'Evil; color: red', 'https://fonts.example.com/evil.woff2'],
			],
		}));
		expect(result).not.toBeNull();
		expect(result!.font).toBeUndefined();
	});

	it('sanitizes font family: sets font to undefined when family contains braces', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
				['c', '#6c63ff', 'primary'],
				['f', 'Evil{inject}', 'https://fonts.example.com/evil.woff2'],
			],
		}));
		expect(result).not.toBeNull();
		expect(result!.font).toBeUndefined();
	});

	it('allows font families with spaces, numbers, hyphens, and underscores', () => {
		const result = parseThemeDefinition(makeEvent({
			tags: [
				['c', '#1a1b2e', 'background'],
				['c', '#e0e0f0', 'text'],
				['c', '#6c63ff', 'primary'],
				['f', 'Open Sans 400', 'https://fonts.example.com/opensans.woff2'],
			],
		}));
		expect(result).not.toBeNull();
		expect(result!.font).toBeDefined();
		expect(result!.font!.family).toBe('Open Sans 400');
	});
});

// ─── decodeNeventInput ───────────────────────────────────────────────────────

describe('decodeNeventInput', () => {
	it('returns { id, relays: [] } for a valid nevent1 string without relay hints', () => {
		const result = decodeNeventInput(NEVENT_NO_RELAY);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(TEST_ID);
		expect(result!.relays).toEqual([]);
	});

	it('returns { id, relays } for a nevent1 string with relay hints', () => {
		const result = decodeNeventInput(NEVENT_WITH_RELAY);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(TEST_ID);
		expect(result!.relays).toEqual(['wss://relay.example.com']);
	});

	it('returns { id, relays: [] } for a bare note1 string', () => {
		const result = decodeNeventInput(NOTE_STR);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(TEST_ID);
		expect(result!.relays).toEqual([]);
	});

	it('returns null for an invalid bech32 string', () => {
		const result = decodeNeventInput('notanevent');
		expect(result).toBeNull();
	});

	it('returns null for a npub bech32 (wrong type)', () => {
		const result = decodeNeventInput(NPUB_STR);
		expect(result).toBeNull();
	});

	it('returns { id: \'\', relays } for a naddr bech32 of kind 36767', () => {
		const result = decodeNeventInput(NADDR_36767);
		expect(result).not.toBeNull();
		expect(result!.id).toBe('');
		expect(result!.relays).toEqual(['wss://relay.example.com']);
	});

	it('handles trimming of surrounding whitespace', () => {
		const result = decodeNeventInput('  ' + NOTE_STR + '  ');
		expect(result).not.toBeNull();
		expect(result!.id).toBe(TEST_ID);
	});
});
