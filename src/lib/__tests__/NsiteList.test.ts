import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import type { NostrEvent } from 'nostr-tools';
import type { NsiteEntry } from '$lib/nostr/loaders';

// Read NsiteList source at import time for static singleton check
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?raw vite import is valid in vitest context
import nsiteListSource from '$lib/components/NsiteList.svelte?raw';

// --- Mocks (vi.mock is hoisted — factories run before imports) ---

// Shared mocks for EventFactory — set up in beforeEach
const mockModify = vi.fn();
const mockBuild = vi.fn();
const mockSign = vi.fn();

// Use a function constructor (not arrow fn) to match ThemePicker pattern
function MockEventFactory(this: any, _opts: unknown) {
	this.modify = mockModify;
	this.build = mockBuild;
	this.sign = mockSign;
}

vi.mock('applesauce-core/event-factory', () => ({
	EventFactory: MockEventFactory,
}));

// setDeleteEvents mock
const mockSetDeleteEvents = vi.fn().mockReturnValue(vi.fn());
vi.mock('applesauce-core/operations/delete', () => ({
	setDeleteEvents: mockSetDeleteEvents,
}));

vi.mock('$lib/nostr/bootstrap', () => ({
	BOOTSTRAP_RELAYS: ['wss://relay.damus.io', 'wss://nos.lol'],
	buildSiteUrl: vi.fn((host: string, _pubkey: string, slug?: string) =>
		slug ? `https://${slug}.${host}` : `https://${host}`
	),
}));

// Imports after mocks
import NsiteList from '$lib/components/NsiteList.svelte';

// --- Helpers ---

function makeNsiteEntry(overrides: Partial<NsiteEntry> & { sourceEvent?: NostrEvent } = {}): NsiteEntry {
	const event: NostrEvent = overrides.sourceEvent ?? {
		id: 'event-abc123',
		kind: 35128,
		pubkey: 'pubkey1234',
		created_at: 1000000,
		content: '',
		tags: [['d', 'my-blog'], ['title', 'My Blog'], ['description', 'A test blog']],
		sig: 'sig',
	};
	return {
		slug: 'my-blog',
		createdAt: 1000000,
		title: 'My Blog',
		description: 'A test blog',
		sourceEvent: event,
		...overrides,
	};
}

function makeMockPool() {
	const sub = { unsubscribe: vi.fn() };
	const observable = {
		subscribe: vi.fn((cb: (msg: NostrEvent | 'EOSE') => void) => {
			cb('EOSE');
			return sub;
		}),
	};
	return {
		req: vi.fn().mockReturnValue(observable),
		publish: vi.fn().mockResolvedValue([]),
	};
}

function makeMockSigner(pubkey = 'pubkey1234') {
	return {
		getPublicKey: vi.fn().mockResolvedValue(pubkey),
		signEvent: vi.fn().mockResolvedValue({ sig: 'mocksig' }),
	};
}

const defaultProps = {
	nsites: [makeNsiteEntry()],
	host: 'npub1test.nsite.lol',
	pubkey: 'pubkey1234',
	isOwner: true,
	writeRelays: ['wss://relay.test'],
};

// --- Setup ---

beforeEach(() => {
	vi.clearAllMocks();

	// Default mock resolutions
	mockModify.mockResolvedValue(vi.fn());
	mockBuild.mockResolvedValue({ kind: 5, content: '', tags: [] });
	mockSign.mockResolvedValue({
		kind: 5,
		id: 'deletion-event-id',
		content: '',
		tags: [],
		pubkey: 'pubkey1234',
		created_at: 1000001,
		sig: 'sig',
	});
	mockSetDeleteEvents.mockReturnValue(vi.fn());
});

// --- NSITE-01/02: Edit icon and inline edit form ---

describe('NsiteList — NSITE-01/02: edit icon and inline edit form', () => {
	it('shows pencil edit icon for each nsite when isOwner=true', () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		// Expect at least one button with aria-label or title containing "edit" or the pencil character
		const editButtons = screen.queryAllByRole('button').filter(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		expect(editButtons.length).toBeGreaterThan(0);
	});

	it('does not show edit icon when isOwner=false', () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: false, pool: pool as any, signer },
		});

		const editButtons = screen.queryAllByRole('button').filter(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		expect(editButtons.length).toBe(0);
	});

	it('clicking edit icon opens inline form with name and description inputs', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		const editButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		expect(editButton).toBeTruthy();
		await fireEvent.click(editButton!);

		// After clicking edit, title and description inputs should appear
		const inputs = screen.queryAllByRole('textbox');
		expect(inputs.length).toBeGreaterThanOrEqual(2);

		// At least one input should have the current title or description value
		const inputValues = inputs.map((i) => (i as HTMLInputElement).value);
		expect(inputValues.some((v) => v === 'My Blog' || v === 'A test blog')).toBe(true);
	});

	it('clicking Save calls EventFactory.modify and pool.publish with updated title and description tags', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer, writeRelays: ['wss://relay.test'] },
		});

		// Open inline edit form
		const editButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		await fireEvent.click(editButton!);

		// Change title input
		const inputs = screen.queryAllByRole('textbox');
		await fireEvent.input(inputs[0], { target: { value: 'Updated Blog' } });

		// Click Save button
		const saveButton = screen.getByRole('button', { name: /save/i });
		await fireEvent.click(saveButton);

		// Wait for async publish
		await waitFor(() => {
			expect(mockModify).toHaveBeenCalled();
		}, { timeout: 2000 });

		expect(pool.publish).toHaveBeenCalled();
	});

	it('publishes to writeRelays when writeRelays is non-empty', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();
		const writeRelays = ['wss://relay.test'];

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer, writeRelays },
		});

		const editButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		await fireEvent.click(editButton!);

		const inputs = screen.queryAllByRole('textbox');
		await fireEvent.input(inputs[0], { target: { value: 'New Title' } });

		const saveButton = screen.getByRole('button', { name: /save/i });
		await fireEvent.click(saveButton);

		await waitFor(() => {
			expect(pool.publish).toHaveBeenCalledWith(writeRelays, expect.any(Object));
		}, { timeout: 2000 });
	});

	it('falls back to BOOTSTRAP_RELAYS when writeRelays is empty', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer, writeRelays: [] },
		});

		const editButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/edit/i) ||
				b.getAttribute('title')?.match(/edit/i) ||
				b.textContent?.includes('✏') ||
				b.textContent?.includes('✎') ||
				b.textContent?.includes('Edit')
		);
		await fireEvent.click(editButton!);

		const inputs = screen.queryAllByRole('textbox');
		await fireEvent.input(inputs[0], { target: { value: 'New Title' } });

		const saveButton = screen.getByRole('button', { name: /save/i });
		await fireEvent.click(saveButton);

		// BOOTSTRAP_RELAYS is mocked as ['wss://relay.damus.io', 'wss://nos.lol']
		await waitFor(() => {
			expect(pool.publish).toHaveBeenCalledWith(
				['wss://relay.damus.io', 'wss://nos.lol'],
				expect.any(Object)
			);
		}, { timeout: 2000 });
	});
});

// --- NSITE-03/04: Delete confirmation and NIP-09 publish ---

describe('NsiteList — NSITE-03/04: delete confirmation and NIP-09 publish', () => {
	it('shows trash delete icon for each nsite when isOwner=true', () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		const deleteButtons = screen.queryAllByRole('button').filter(
			(b) =>
				b.getAttribute('aria-label')?.match(/delete/i) ||
				b.getAttribute('title')?.match(/delete/i) ||
				b.textContent?.includes('🗑') ||
				b.textContent?.includes('Delete') ||
				b.textContent?.includes('✕') ||
				b.textContent?.includes('×')
		);
		expect(deleteButtons.length).toBeGreaterThan(0);
	});

	it('clicking delete icon shows inline confirm with best-effort text', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		const deleteButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/delete/i) ||
				b.getAttribute('title')?.match(/delete/i) ||
				b.textContent?.includes('🗑') ||
				b.textContent?.includes('Delete') ||
				b.textContent?.includes('✕') ||
				b.textContent?.includes('×')
		);
		expect(deleteButton).toBeTruthy();
		await fireEvent.click(deleteButton!);

		// After clicking delete, confirmation text with best-effort language should appear
		await waitFor(() => {
			const text = document.body.textContent ?? '';
			expect(text).toMatch(/request deletion.*best.effort|best.effort.*deletion|deletion.*request/i);
		}, { timeout: 2000 });
	});

	it('confirm delete calls EventFactory.build + setDeleteEvents + pool.publish', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();
		const nsiteEntry = makeNsiteEntry();

		render(NsiteList, {
			props: { ...defaultProps, nsites: [nsiteEntry], isOwner: true, pool: pool as any, signer },
		});

		// Click the trash/delete icon
		const deleteButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/delete/i) ||
				b.getAttribute('title')?.match(/delete/i) ||
				b.textContent?.includes('🗑') ||
				b.textContent?.includes('Delete') ||
				b.textContent?.includes('✕') ||
				b.textContent?.includes('×')
		);
		await fireEvent.click(deleteButton!);

		// Click the confirm Delete button in the inline confirm dialog
		const confirmButton = await waitFor(
			() => screen.getByRole('button', { name: /^delete$/i }),
			{ timeout: 2000 }
		);
		await fireEvent.click(confirmButton);

		// Wait for async deletion to complete
		await waitFor(() => {
			expect(mockBuild).toHaveBeenCalled();
		}, { timeout: 2000 });

		expect(mockSetDeleteEvents).toHaveBeenCalledWith([nsiteEntry.sourceEvent]);
		expect(pool.publish).toHaveBeenCalled();
	});

	it('after deletion nsite is removed from the rendered list', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		// Confirm the nsite title is visible initially
		expect(screen.getByText('My Blog')).toBeTruthy();

		const deleteButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/delete/i) ||
				b.getAttribute('title')?.match(/delete/i) ||
				b.textContent?.includes('🗑') ||
				b.textContent?.includes('Delete') ||
				b.textContent?.includes('✕') ||
				b.textContent?.includes('×')
		);
		await fireEvent.click(deleteButton!);

		const confirmButton = await waitFor(
			() => screen.getByRole('button', { name: /^delete$/i }),
			{ timeout: 2000 }
		);
		await fireEvent.click(confirmButton);

		// After deletion, the nsite card should no longer appear in the list
		await waitFor(() => {
			expect(screen.queryByText('My Blog')).toBeNull();
		}, { timeout: 2000 });
	});

	it('"Deletion requested" indicator appears after successful deletion', async () => {
		const pool = makeMockPool();
		const signer = makeMockSigner();

		render(NsiteList, {
			props: { ...defaultProps, isOwner: true, pool: pool as any, signer },
		});

		const deleteButton = screen.queryAllByRole('button').find(
			(b) =>
				b.getAttribute('aria-label')?.match(/delete/i) ||
				b.getAttribute('title')?.match(/delete/i) ||
				b.textContent?.includes('🗑') ||
				b.textContent?.includes('Delete') ||
				b.textContent?.includes('✕') ||
				b.textContent?.includes('×')
		);
		await fireEvent.click(deleteButton!);

		const confirmButton = await waitFor(
			() => screen.getByRole('button', { name: /^delete$/i }),
			{ timeout: 2000 }
		);
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(screen.queryByText(/deletion requested/i)).toBeTruthy();
		}, { timeout: 2000 });
	});
});

// --- Architecture: no singleton imports ---

describe('NsiteList — architecture: no singleton imports', () => {
	it('has zero imports from $lib/nostr/store', () => {
		const matches = (nsiteListSource as string).match(/from ['"].*nostr\/store['"]/g) ?? [];
		expect(matches).toHaveLength(0);
	});

	it('has zero imports from $lib/auth.svelte', () => {
		const matches = (nsiteListSource as string).match(/from ['"].*auth\.svelte['"]/g) ?? [];
		expect(matches).toHaveLength(0);
	});
});
