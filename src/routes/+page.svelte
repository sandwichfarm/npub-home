<script lang="ts">
	import { onMount } from 'svelte';
	import { nip19 } from 'nostr-tools';
	import { parseNpubFromHostname, BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';
	import { subscribe, hydrateFromCache, getNsitesFromStore, type NsiteEntry } from '$lib/nostr/loaders';
	import { eventStore, pool } from '$lib/nostr/store';
	import { parseActiveProfileTheme, applyTheme, clearTheme } from '$lib/theme';
	import { getOutboxes } from 'applesauce-core/helpers/mailboxes';
	import type { ProfileContent } from 'applesauce-core/helpers/profile';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import NsiteList from '$lib/components/NsiteList.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import { restoreSession, logout, isOwner, getSigner } from '$lib/auth.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import OwnerBadge from '$lib/components/OwnerBadge.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';

	let error = $state<string | null>(null);
	let profile = $state<ProfileContent | undefined>(undefined);
	let nsites = $state<NsiteEntry[]>([]);
	let npub = $state('');
	let host = $state('');
	let pubkey = $state('');
	let showLoginModal = $state(false);
	let showThemePicker = $state(false);
	let writeRelays = $state<string[]>([]);

	onMount(() => {
		import('@nsite/stealthis');

		host = window.location.host;
		const parsed = parseNpubFromHostname(window.location.hostname);

		if (!parsed) {
			error = 'No npub found in hostname. Deploy this site to an nsite domain.';
			return;
		}

		restoreSession();

		const unsubscribe = subscribe(parsed);
		const extraSubs: Array<{ unsubscribe(): void }> = [];
		let profileSub: { unsubscribe(): void } | null = null;
		let nsiteSub: { unsubscribe(): void } | null = null;
		let themeSub: { unsubscribe(): void } | null = null;
		let relaySub: { unsubscribe(): void } | null = null;
		let boundPubkey: string | null = null;

		function cleanupAuthorSubscriptions() {
			profileSub?.unsubscribe();
			nsiteSub?.unsubscribe();
			themeSub?.unsubscribe();
			relaySub?.unsubscribe();
			profileSub = null;
			nsiteSub = null;
			themeSub = null;
			relaySub = null;
		}

		function bindAuthor(nextPubkey: string) {
			if (boundPubkey === nextPubkey) return;
			boundPubkey = nextPubkey;
			pubkey = nextPubkey;
			npub = nip19.npubEncode(nextPubkey);
			hydrateFromCache(nextPubkey);
			cleanupAuthorSubscriptions();

			profileSub = eventStore.profile(nextPubkey).subscribe((p) => {
				profile = p;
			});

			nsiteSub = eventStore
				.filters({ kinds: [15128, 35128, 5128], authors: [nextPubkey] })
				.subscribe(() => {
					nsites = getNsitesFromStore(nextPubkey, { includeRoot: true });
				});

			themeSub = eventStore
				.filters({ kinds: [16767], authors: [nextPubkey] })
				.subscribe((events) => {
					if (!events) return;
					const allThemeEvents = eventStore.getByFilters({
						kinds: [16767],
						authors: [nextPubkey]
					});
					if (allThemeEvents.length === 0) return;

					const latest = allThemeEvents.sort((a, b) => b.created_at - a.created_at)[0];
					const theme = parseActiveProfileTheme(latest);
					if (theme) applyTheme(theme);
				});

			// Reactively read kind 10002 relay list to compute writeRelays
			relaySub = eventStore
				.filters({ kinds: [10002], authors: [nextPubkey] })
				.subscribe((event) => {
					if (!event) return;
					const relays = getOutboxes(event);
					writeRelays = relays.length > 0 ? relays : BOOTSTRAP_RELAYS;
				});

			nsites = getNsitesFromStore(nextPubkey, { includeRoot: true });
		}

		if (parsed.type === 'snapshot') {
			extraSubs.push(
				eventStore
					.filters({ ids: [parsed.snapshotId], kinds: [5128] })
					.subscribe((event) => {
						if (!event) return;
						bindAuthor(event.pubkey);
					})
			);
		} else {
			bindAuthor(parsed.pubkey);
		}

		return () => {
			unsubscribe();
			cleanupAuthorSubscriptions();
			for (const sub of extraSubs) sub.unsubscribe();
			clearTheme();
		};
	});
</script>

<svelte:head>
	<title>{profile?.display_name || profile?.name || 'nsite'}</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-2xl py-8">
		{#if showLoginModal}
			<LoginModal onClose={() => (showLoginModal = false)} />
		{/if}
		{#if showThemePicker}
			<ThemePicker
				signer={getSigner()!}
				{pool}
				{pubkey}
				{writeRelays}
				onclose={() => (showThemePicker = false)}
			/>
		{/if}
		{#if error && !profile}
			<ErrorMessage message={error} />
		{:else}
			<div class="overflow-hidden rounded-xl border border-border bg-background">
				{#if isOwner()}
					<OwnerBadge ontheme={() => (showThemePicker = true)} />
				{/if}
				<ProfileCard {profile} {npub} />
				<NsiteList
					{nsites}
					{host}
					{pubkey}
					isOwner={isOwner()}
					signer={getSigner() ?? undefined}
					{pool}
					{writeRelays}
				/>
			</div>
			<div class="mt-6 flex items-center justify-center gap-4">
				<nsite-deploy label="Steal this nsite"></nsite-deploy>
				<a
					href="https://github.com/sandwichfarm/npub-home"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-muted-foreground hover:text-foreground"
				>GitHub</a>
				{#if isOwner()}
					<span class="flex items-center gap-1">
						<button
							class="text-sm text-muted-foreground underline hover:text-foreground"
							onclick={logout}
						>Logout</button>
						<span
							class="inline-block h-2 w-2 rounded-full bg-primary"
							aria-label="Owner"
						></span>
					</span>
				{:else}
					<button
						class="text-sm text-muted-foreground hover:text-foreground"
						onclick={() => (showLoginModal = true)}
					>Login</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
