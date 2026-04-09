import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import type { NostrEvent } from 'nostr-tools';

// Read ThemePicker source at import time (vitest supports ?raw imports for text content)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?raw vite import is valid in vitest context
import themePickerSource from '$lib/components/ThemePicker.svelte?raw';

// --- Mocks (vi.mock is hoisted — factories run before imports) ---

vi.mock('$lib/theme', () => ({
	applyTheme: vi.fn(),
	clearTheme: vi.fn(),
	parseThemeDefinition: vi.fn(),
	decodeNeventInput: vi.fn(),
}));

vi.mock('$lib/nostr/bootstrap', () => ({
	BOOTSTRAP_RELAYS: ['wss://relay.damus.io', 'wss://nos.lol'],
}));

// Shared mocks for EventFactory build and sign — set up in beforeEach
// These are module-level so vi.mock factory can reference them via closure.
const mockBuild = vi.fn();
const mockSign = vi.fn();

// Mock EventFactory from applesauce-core/event-factory
// Use a function constructor (not arrow fn) so vitest doesn't warn about class mocking.
function MockEventFactory(this: any, _opts: unknown) {
	this.build = mockBuild;
	this.sign = mockSign;
}

vi.mock('applesauce-core/event-factory', () => ({
	EventFactory: MockEventFactory,
}));

// Imports after mocks
import { applyTheme, clearTheme, parseThemeDefinition, decodeNeventInput } from '$lib/theme';
import ThemePicker from '$lib/components/ThemePicker.svelte';

// --- Helpers ---

/** Build a minimal kind 36767 NostrEvent for testing. */
function makeThemeEvent(id: string, title: string, bg = '#1a1a2e', text = '#e0e0e0', primary = '#7c5cbf'): NostrEvent {
	return {
		id,
		kind: 36767,
		pubkey: 'aabbccdd1234567890aabbccdd1234567890aabbccdd1234567890aabbccdd12',
		created_at: 1000000,
		content: '',
		tags: [
			['d', `d-${id}`],
			['title', title],
			['c', bg, 'background'],
			['c', text, 'text'],
			['c', primary, 'primary'],
			['alt', `Custom theme: ${title}`],
		],
		sig: 'sig',
	};
}

/** Create a mock pool. When given an event, subscribe emits it then EOSE synchronously. */
function makeMockPool(event?: NostrEvent) {
	const sub = { unsubscribe: vi.fn() };
	const observable = {
		subscribe: vi.fn((cb: (msg: NostrEvent | 'EOSE') => void) => {
			if (event) cb(event);
			cb('EOSE');
			return sub;
		}),
	};
	const pool = {
		req: vi.fn().mockReturnValue(observable),
		publish: vi.fn().mockResolvedValue([]),
	};
	return pool;
}

/** Create a mock EventSigner. */
function makeMockSigner(pubkey = 'deadbeef') {
	return {
		getPublicKey: vi.fn().mockResolvedValue(pubkey),
		// EventSigner interface requires signEvent
		signEvent: vi.fn().mockResolvedValue({ sig: 'mocksig' }),
	};
}

const defaultProps = {
	pubkey: 'testpubkey1234',
	writeRelays: ['wss://relay.test'],
	onclose: vi.fn(),
};

// --- Setup ---

beforeEach(() => {
	vi.clearAllMocks();

	// Default: parseThemeDefinition returns a valid theme
	vi.mocked(parseThemeDefinition).mockReturnValue({
		colors: { background: '228 20% 10%', text: '210 40% 98%', primary: '258 70% 60%' },
	});
	// Default: decodeNeventInput returns a fake decoded ref (so curated fetch runs)
	vi.mocked(decodeNeventInput).mockReturnValue({
		id: 'fakeid00001',
		relays: ['wss://relay.damus.io'],
	});

	// Configure EventFactory instance mocks
	mockBuild.mockResolvedValue({ kind: 16767, content: '', tags: [] });
	mockSign.mockResolvedValue({
		kind: 16767,
		id: 'signedid',
		content: '',
		tags: [],
		pubkey: 'deadbeef',
		created_at: 1000001,
		sig: 'sig',
	});
});

// --- THEME-04: applyTheme called when theme card is clicked ---

describe('ThemePicker — THEME-04: applyTheme on card click', () => {
	it('calls applyTheme with the parsed theme when a theme card is clicked', async () => {
		const themeEvent = makeThemeEvent('abc123', 'Ocean Night');
		const parsedTheme = {
			colors: { background: '228 20% 10%', text: '210 40% 98%', primary: '258 70% 60%' },
		};

		// decodeNeventInput returns a valid id so pool.req fires
		vi.mocked(decodeNeventInput).mockReturnValue({ id: 'abc123', relays: ['wss://relay.damus.io'] });
		vi.mocked(parseThemeDefinition).mockReturnValue(parsedTheme);

		const pool = makeMockPool(themeEvent);
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any },
		});

		// Wait for loading to finish (3s timer) + theme cards to appear
		await waitFor(() => {
			const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
			expect(cards.length).toBeGreaterThan(0);
		}, { timeout: 4000 });

		// Click the first theme card
		const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
		await fireEvent.click(cards[0]);

		expect(applyTheme).toHaveBeenCalledWith(parsedTheme);
	});

	it('applyTheme is not called before any card is clicked', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any },
		});

		// At mount time, applyTheme should not have been called
		expect(applyTheme).not.toHaveBeenCalled();
	});
});

// --- THEME-05: EventFactory.build + sign + pool.publish on Apply Theme ---

describe('ThemePicker — THEME-05: publish kind 16767 on Apply Theme', () => {
	it('calls EventFactory.build, sign, and pool.publish when Apply Theme is clicked after selecting a theme', async () => {
		const themeEvent = makeThemeEvent('theme01', 'Test Theme');
		const parsedTheme = {
			colors: { background: '228 20% 10%', text: '210 40% 98%', primary: '258 70% 60%' },
		};
		const onclose = vi.fn();

		vi.mocked(decodeNeventInput).mockReturnValue({ id: 'theme01', relays: ['wss://relay.damus.io'] });
		vi.mocked(parseThemeDefinition).mockReturnValue(parsedTheme);

		const pool = makeMockPool(themeEvent);
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any, onclose },
		});

		// Wait for theme cards
		await waitFor(() => {
			const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
			expect(cards.length).toBeGreaterThan(0);
		}, { timeout: 4000 });

		// Click a theme card to select it
		const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
		await fireEvent.click(cards[0]);

		// Click Apply Theme
		const applyButton = screen.getByRole('button', { name: /apply theme/i });
		expect(applyButton).not.toBeDisabled();
		await fireEvent.click(applyButton);

		// Wait for async publish
		await waitFor(() => {
			expect(mockBuild).toHaveBeenCalled();
		}, { timeout: 2000 });

		expect(mockSign).toHaveBeenCalled();
		expect(pool.publish).toHaveBeenCalled();
	});

	it('publishes to writeRelays when writeRelays is non-empty', async () => {
		const themeEvent = makeThemeEvent('theme02', 'Test Theme 2');
		const writeRelays = ['wss://custom.relay', 'wss://another.relay'];
		const onclose = vi.fn();

		vi.mocked(decodeNeventInput).mockReturnValue({ id: 'theme02', relays: ['wss://relay.damus.io'] });
		vi.mocked(parseThemeDefinition).mockReturnValue({
			colors: { background: '0 0% 10%', text: '0 0% 90%', primary: '240 70% 60%' },
		});

		const pool = makeMockPool(themeEvent);
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { pubkey: 'testpubkey', signer, pool: pool as any, writeRelays, onclose },
		});

		await waitFor(() => {
			const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
			expect(cards.length).toBeGreaterThan(0);
		}, { timeout: 4000 });

		const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
		await fireEvent.click(cards[0]);

		const applyButton = screen.getByRole('button', { name: /apply theme/i });
		await fireEvent.click(applyButton);

		await waitFor(() => {
			expect(pool.publish).toHaveBeenCalledWith(writeRelays, expect.any(Object));
		}, { timeout: 2000 });
	});

	it('falls back to BOOTSTRAP_RELAYS when writeRelays is empty', async () => {
		const themeEvent = makeThemeEvent('theme03', 'Test Theme 3');
		const onclose = vi.fn();

		vi.mocked(decodeNeventInput).mockReturnValue({ id: 'theme03', relays: ['wss://relay.damus.io'] });
		vi.mocked(parseThemeDefinition).mockReturnValue({
			colors: { background: '0 0% 10%', text: '0 0% 90%', primary: '20 100% 50%' },
		});

		const pool = makeMockPool(themeEvent);
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { pubkey: 'testpubkey', signer, pool: pool as any, writeRelays: [], onclose },
		});

		await waitFor(() => {
			const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
			expect(cards.length).toBeGreaterThan(0);
		}, { timeout: 4000 });

		const cards = screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
		await fireEvent.click(cards[0]);

		const applyButton = screen.getByRole('button', { name: /apply theme/i });
		await fireEvent.click(applyButton);

		// BOOTSTRAP_RELAYS is mocked as ['wss://relay.damus.io', 'wss://nos.lol']
		await waitFor(() => {
			expect(pool.publish).toHaveBeenCalledWith(
				['wss://relay.damus.io', 'wss://nos.lol'],
				expect.any(Object)
			);
		}, { timeout: 2000 });
	});
});

// --- THEME-06: No singleton imports (static file check) ---

describe('ThemePicker — THEME-06: no singleton imports', () => {
	it('has zero imports from $lib/nostr/store', () => {
		// themePickerSource is the raw .svelte file content imported via Vite's ?raw
		const matches = (themePickerSource as string).match(/from ['"].*nostr\/store['"]/g) ?? [];
		expect(matches).toHaveLength(0);
	});

	it('has zero imports from $lib/auth.svelte', () => {
		const matches = (themePickerSource as string).match(/from ['"].*auth\.svelte['"]/g) ?? [];
		expect(matches).toHaveLength(0);
	});
});

// --- Modal behavior ---

describe('ThemePicker — modal behavior', () => {
	it('renders the modal title "Pick a Theme"', () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any },
		});

		expect(screen.getByText('Pick a Theme')).toBeTruthy();
	});

	it('calls clearTheme and onclose when close button (&#x2715;) is clicked', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();
		const onclose = vi.fn();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any, onclose },
		});

		const closeButton = screen.getByRole('button', { name: /close/i });
		await fireEvent.click(closeButton);

		expect(clearTheme).toHaveBeenCalled();
		expect(onclose).toHaveBeenCalled();
	});

	it('calls clearTheme and onclose when Keep Current Theme is clicked', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();
		const onclose = vi.fn();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any, onclose },
		});

		const keepButton = screen.getByRole('button', { name: /keep current theme/i });
		await fireEvent.click(keepButton);

		expect(clearTheme).toHaveBeenCalled();
		expect(onclose).toHaveBeenCalled();
	});

	it('Apply Theme button is disabled when no theme is selected', () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any },
		});

		const applyButton = screen.getByRole('button', { name: /apply theme/i });
		expect(applyButton).toBeDisabled();
	});

	it('shows nevent error when addCustomTheme is called with an invalid reference', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		// decodeNeventInput returns null for invalid input
		vi.mocked(decodeNeventInput).mockReturnValueOnce(null); // curated skipped
		vi.mocked(decodeNeventInput).mockReturnValueOnce(null); // custom input decode fails

		render(ThemePicker, {
			props: { ...defaultProps, signer, pool: pool as any },
		});

		// Type an invalid nevent reference
		const input = screen.getByPlaceholderText('nevent1...');
		await fireEvent.input(input, { target: { value: 'invalid-nevent-ref' } });

		// Click Add Theme
		const addButton = screen.getByRole('button', { name: /add theme/i });
		await fireEvent.click(addButton);

		// Error message should appear
		await waitFor(() => {
			expect(screen.queryByText(/could not fetch theme/i)).toBeTruthy();
		});
	});
});
