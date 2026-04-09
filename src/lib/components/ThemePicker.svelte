<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent } from 'nostr-tools';
	import type { RelayPool } from 'applesauce-relay';
	import type { EventSigner } from 'applesauce-core/event-factory';
	import { EventFactory } from 'applesauce-core/event-factory';
	import { parseThemeDefinition, decodeNeventInput, applyTheme, clearTheme } from '$lib/theme';
	import type { ActiveProfileTheme } from '$lib/theme';
	import { BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	// --- Types ---

	interface ThemeEntry {
		event: NostrEvent;
		parsed: ActiveProfileTheme;
		name: string;
	}

	// --- Props ---

	let {
		signer,
		pool,
		pubkey,
		writeRelays,
		onclose,
	}: {
		signer: EventSigner;
		pool: RelayPool;
		pubkey: string;
		writeRelays: string[];
		onclose: () => void;
	} = $props();

	// --- Curated themes (surveyed from public relays 2026-04-09) ---
	// naddr references for real kind 36767 events found on wss://relay.damus.io, wss://nos.lol, wss://purplepag.es

	const CURATED_THEMES: { ref: string; name: string }[] = [
		{
			ref: 'naddr1qqfk6etyd96x2unjv9hx2ctw94j8yetpd5pzqe9l4x4lled335rnrmk40vupwwku9w5fh7ruz6x6jpgh7qs7wg44qvzqqqy0nutxymdp',
			name: 'Mediterranean Dream',
		},
		{
			ref: 'naddr1qqrxxmmnd4hhxq3q8ams6ewn5aj2n3wt2qawzglx9mr4nzksxhvrdc4gzrecw7n5tvjqxpqqqz8e7d40hv9',
			name: 'Cosmos',
		},
		{
			ref: 'naddr1qqzhxmrpw3jsyg8wd6sn4w07t39x36hekx35lcq55e45qytu2rhz5c20fndftxmwwspsgqqq370s5uz4q6',
			name: 'Slate',
		},
		{
			ref: 'naddr1qqyksctvd3hhwet9dcpzqprpljlvcnpnw3pejvkkhrc3y6wvmd7vjuad0fg2ud3dky66gaxaqvzqqqy0nu5vdhv0',
			name: 'Halloween',
		},
		{
			ref: 'naddr1qqrkx6tjvd6kjaqzypnxw52cucecl6ylmfqcus4qhu4852cny5zd6drlq9dp39cmv3zrqqcyqqqgl8cwulyk4',
			name: 'Circuit',
		},
		{
			ref: 'naddr1qq9kwun9v4hz6mrfva58gq3q4rg4vrt2v374q95ezeeydu3hkdhmzglcj950mggacap4x0lv0gyqxpqqqz8e7uzpzg9',
			name: 'Green Light',
		},
		{
			ref: 'naddr1qq9kummjw35z6am0daj8xq3qjawsh2wrjk25urgx4qq65fam67nrrkdf4zjxrhcezv5v69g9gxwqxpqqqz8e7tt5wdw',
			name: 'North Woods',
		},
		{
			ref: 'naddr1qqrhvetwv96x7uszyrpt5ppu4xmmzw6azwp2sxpe7uyk4s4s49536w8207td5ys8k8ktuqcyqqqgl8cgqvfk0',
			name: 'Venator',
		},
	];

	// --- State ---

	let themes = $state<ThemeEntry[]>([]);
	let loading = $state(true);
	let selectedEvent = $state<NostrEvent | null>(null);
	let neventInput = $state('');
	let neventError = $state<string | null>(null);
	let neventLoading = $state(false);
	let publishing = $state(false);
	let publishError = $state<string | null>(null);

	// --- Lifecycle ---

	onMount(() => {
		const subs: { unsubscribe(): void }[] = [];
		const seen = new Set<string>();

		// Fetch all curated themes concurrently
		CURATED_THEMES.forEach(({ ref }) => {
			const decoded = decodeNeventInput(ref);
			if (!decoded) return;

			// For naddr (id is empty string), skip — naddr needs kind+pubkey+d-tag filter
			// which requires nip19.decode naddr handling beyond what decodeNeventInput returns.
			// Curated entries are provided as naddr refs; use fallback event ID approach instead.
			if (!decoded.id) return;

			const relays = decoded.relays.length > 0 ? decoded.relays : BOOTSTRAP_RELAYS;
			const sub = pool.req(relays, [{ ids: [decoded.id], kinds: [36767] }]).subscribe((msg) => {
				if (msg === 'EOSE') return;
				if (seen.has(msg.id)) return;
				seen.add(msg.id);
				const parsed = parseThemeDefinition(msg);
				if (!parsed) return;
				const titleTag = msg.tags.find((t) => t[0] === 'title')?.[1];
				const dTag = msg.tags.find((t) => t[0] === 'd')?.[1];
				const name = titleTag ?? dTag ?? 'Unnamed Theme';
				themes = [...themes, { event: msg, parsed, name }];
			});
			subs.push(sub);
		});

		// Fetch curated themes by naddr (kind+pubkey+d-tag) for entries with naddr refs
		// Parse the naddr refs directly using nip19 to get kind/pubkey/d-tag filters
		import('nostr-tools').then(({ nip19 }) => {
			CURATED_THEMES.forEach(({ ref, name: curatedName }) => {
				try {
					const decoded = nip19.decode(ref);
					if (decoded.type !== 'naddr') return;
					const { kind, pubkey: authorPubkey, identifier, relays: naddrRelays } = decoded.data;
					const relays = (naddrRelays && naddrRelays.length > 0) ? naddrRelays : BOOTSTRAP_RELAYS;
					const filter = [{ kinds: [kind], authors: [authorPubkey], '#d': [identifier] }];
					const sub = pool.req(relays, filter).subscribe((msg) => {
						if (msg === 'EOSE') return;
						if (seen.has(msg.id)) return;
						seen.add(msg.id);
						const parsed = parseThemeDefinition(msg);
						if (!parsed) return;
						const titleTag = msg.tags.find((t) => t[0] === 'title')?.[1];
						const dTag = msg.tags.find((t) => t[0] === 'd')?.[1];
						const name = titleTag ?? dTag ?? curatedName;
						themes = [...themes, { event: msg, parsed, name }];
					});
					subs.push(sub);
				} catch {
					// invalid naddr — skip
				}
			});
		});

		// Set loading = false after timeout (covers EOSE from all relays)
		const timer = setTimeout(() => { loading = false; }, 3000);

		return () => {
			subs.forEach((s) => s.unsubscribe());
			clearTimeout(timer);
		};
	});

	// --- Handlers ---

	function selectTheme(entry: ThemeEntry) {
		selectedEvent = entry.event;
		applyTheme(entry.parsed);
	}

	function handleClose() {
		clearTheme();
		// +page.svelte's themeSub will re-apply the stored kind 16767 theme if any
		onclose();
	}

	async function addCustomTheme() {
		neventError = null;
		const decoded = decodeNeventInput(neventInput.trim());
		if (!decoded) {
			neventError = 'Could not fetch theme. Check the nevent reference and try again.';
			return;
		}
		neventLoading = true;
		try {
			if (decoded.id) {
				// nevent or note: fetch by event ID
				const relays = decoded.relays.length > 0 ? decoded.relays : BOOTSTRAP_RELAYS;
				await new Promise<void>((resolve, reject) => {
					const sub = pool.req(relays, [{ ids: [decoded.id], kinds: [36767] }]).subscribe((msg) => {
						if (msg === 'EOSE') { sub.unsubscribe(); reject(new Error('not found')); return; }
						if (msg.kind !== 36767) { sub.unsubscribe(); reject(new Error('not a theme')); return; }
						const parsed = parseThemeDefinition(msg);
						if (!parsed) { sub.unsubscribe(); reject(new Error('invalid theme')); return; }
						const titleTag = msg.tags.find((t) => t[0] === 'title')?.[1];
						const dTag = msg.tags.find((t) => t[0] === 'd')?.[1];
						const name = titleTag ?? dTag ?? 'Unnamed Theme';
						themes = [...themes, { event: msg, parsed, name }];
						neventInput = '';
						sub.unsubscribe();
						resolve();
					});
				});
			} else {
				// naddr: fetch by kind+pubkey+d-tag
				const { nip19 } = await import('nostr-tools');
				const naddrDecoded = nip19.decode(neventInput.trim());
				if (naddrDecoded.type !== 'naddr') {
					neventError = 'Could not fetch theme. Check the nevent reference and try again.';
					neventLoading = false;
					return;
				}
				const { kind, pubkey: authorPubkey, identifier, relays: naddrRelays } = naddrDecoded.data;
				const relays = (naddrRelays && naddrRelays.length > 0) ? naddrRelays : BOOTSTRAP_RELAYS;
				await new Promise<void>((resolve, reject) => {
					const sub = pool.req(relays, [{ kinds: [kind], authors: [authorPubkey], '#d': [identifier] }]).subscribe((msg) => {
						if (msg === 'EOSE') { sub.unsubscribe(); reject(new Error('not found')); return; }
						if (msg.kind !== 36767) { sub.unsubscribe(); reject(new Error('not a theme')); return; }
						const parsed = parseThemeDefinition(msg);
						if (!parsed) { sub.unsubscribe(); reject(new Error('invalid theme')); return; }
						const titleTag = msg.tags.find((t) => t[0] === 'title')?.[1];
						const dTag = msg.tags.find((t) => t[0] === 'd')?.[1];
						const name = titleTag ?? dTag ?? 'Unnamed Theme';
						themes = [...themes, { event: msg, parsed, name }];
						neventInput = '';
						sub.unsubscribe();
						resolve();
					});
				});
			}
		} catch {
			neventError = 'Could not fetch theme. Check the nevent reference and try again.';
		} finally {
			neventLoading = false;
		}
	}

	async function applySelectedTheme() {
		if (!selectedEvent) return;
		publishing = true;
		publishError = null;
		try {
			// Copy c/f/bg tags directly from source event — avoids hex/HSL round-trip (Pitfall 1)
			const sourceTags = selectedEvent.tags.filter(
				(t) => t[0] === 'c' || t[0] === 'f' || t[0] === 'bg'
			);
			// Include a back-reference to the source kind 36767 if it has a d-tag
			const dTag = selectedEvent.tags.find((t) => t[0] === 'd')?.[1];
			const aTag: string[][] = dTag
				? [['a', `36767:${selectedEvent.pubkey}:${dTag}`, '']]
				: [];
			const factory = new EventFactory({ signer });
			const template = await factory.build({
				kind: 16767,
				content: '',
				tags: [
					...sourceTags,
					['alt', 'Active profile theme'],
					...aTag,
				],
			});
			const signed = await factory.sign(template);
			const targets = writeRelays.length > 0 ? writeRelays : BOOTSTRAP_RELAYS;
			await pool.publish(targets, signed);
			onclose();
		} catch {
			publishError = 'Failed to publish theme. Check your connection and try again.';
		} finally {
			publishing = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && handleClose()} />

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
	role="presentation"
	onclick={handleClose}
>
	<!-- Modal panel -->
	<div
		class="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-label="Pick a Theme"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
	>
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-foreground">Pick a Theme</h2>
			<button
				class="text-muted-foreground hover:text-foreground"
				onclick={handleClose}
				aria-label="Close"
			>&#x2715;</button>
		</div>

		<!-- Theme grid -->
		{#if loading && themes.length === 0}
			<LoadingSpinner message="Loading themes..." />
		{:else if !loading && themes.length === 0}
			<div class="py-8 text-center">
				<p class="text-sm font-medium text-foreground">No themes found</p>
				<p class="mt-1 text-xs text-muted-foreground">Could not load themes from relays. Check your connection and refresh.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each themes as entry (entry.event.id)}
					{@const bgHex = entry.event.tags.find((t) => t[0] === 'c' && t[2] === 'background')?.[1] ?? '#888888'}
					{@const textHex = entry.event.tags.find((t) => t[0] === 'c' && t[2] === 'text')?.[1] ?? '#888888'}
					{@const primaryHex = entry.event.tags.find((t) => t[0] === 'c' && t[2] === 'primary')?.[1] ?? '#888888'}
					<button
						class="rounded-lg border p-3 text-left transition-colors
							{selectedEvent?.id === entry.event.id
								? 'border-primary ring-2 ring-primary bg-card'
								: 'border-border bg-card hover:border-primary/50 hover:bg-secondary'}"
						aria-pressed={selectedEvent?.id === entry.event.id}
						onclick={() => selectTheme(entry)}
					>
						<div class="mb-2 flex gap-2">
							<span
								class="h-5 w-5 rounded-full"
								style="background-color: {bgHex}"
								aria-hidden="true"
							></span>
							<span
								class="h-5 w-5 rounded-full"
								style="background-color: {textHex}"
								aria-hidden="true"
							></span>
							<span
								class="h-5 w-5 rounded-full"
								style="background-color: {primaryHex}"
								aria-hidden="true"
							></span>
						</div>
						<p class="text-sm font-medium text-foreground">{entry.name}</p>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Divider -->
		<div class="my-4 border-t border-border"></div>

		<!-- nevent paste input -->
		<div class="mb-4">
			<label class="mb-1 block text-xs text-muted-foreground" for="nevent-input">
				Add custom theme
			</label>
			<input
				id="nevent-input"
				type="text"
				class="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="nevent1..."
				bind:value={neventInput}
			/>
			{#if neventError}
				<p class="mt-1 text-sm text-destructive">
					{neventError}
					<button
						class="ml-1 text-primary underline"
						onclick={() => addCustomTheme()}
					>Retry</button>
				</p>
			{/if}
			<button
				class="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50"
				disabled={neventLoading || !neventInput.trim()}
				onclick={addCustomTheme}
			>
				{neventLoading ? 'Fetching...' : 'Add Theme'}
			</button>
		</div>

		<!-- Action row -->
		<div class="flex flex-col gap-2">
			<button
				class="min-h-[44px] w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50"
				disabled={!selectedEvent || publishing}
				onclick={applySelectedTheme}
			>
				{publishing ? 'Applying...' : 'Apply Theme'}
			</button>
			<button
				class="text-sm text-muted-foreground underline hover:text-foreground"
				onclick={handleClose}
			>
				Keep Current Theme
			</button>
		</div>

		<!-- Publish error -->
		{#if publishError}
			<p class="mt-2 text-sm text-destructive">{publishError}</p>
		{/if}
	</div>
</div>
