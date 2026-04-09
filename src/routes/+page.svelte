<script lang="ts">
	import { onMount } from 'svelte';
	import { parseNpubFromHostname } from '$lib/nostr/bootstrap';
	import { subscribe, hydrateFromCache, getNsitesFromStore, type NsiteEntry } from '$lib/nostr/loaders';
	import { eventStore } from '$lib/nostr/store';
	import { parseActiveProfileTheme, applyTheme, clearTheme } from '$lib/theme';
	import type { ProfileContent } from 'applesauce-core/helpers/profile';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import NsiteList from '$lib/components/NsiteList.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import { restoreSession, logout, isOwner, getSigner } from '$lib/auth.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import OwnerBadge from '$lib/components/OwnerBadge.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { getOutboxes } from 'applesauce-core/helpers/mailboxes';
	import { pool } from '$lib/nostr/store';
	import { BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';

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

		let cleanupFns: (() => void)[] = [];

		restoreSession().then(() => {
			host = window.location.host;
			const parsed = parseNpubFromHostname(window.location.hostname);

			if (!parsed) {
				error = 'No npub found in hostname. Deploy this site to an nsite domain.';
				return;
			}

			npub = parsed.npub;
			pubkey = parsed.pubkey;

			// Hydrate from localStorage for instant rendering
			hydrateFromCache(parsed.pubkey);

			// Fire subscriptions — events stream into eventStore (will update cache)
			const unsubscribe = subscribe(parsed.pubkey);

			// Reactively read profile from eventStore
			const profileSub = eventStore.profile(parsed.pubkey).subscribe((p) => {
				profile = p;
			});

			// Reactively read nsites from eventStore as events arrive
			const isNamedSite = !!parsed.identifier;
			const nsiteSub = eventStore
				.filters({ kinds: [15128, 35128], authors: [parsed.pubkey] })
				.subscribe(() => {
					nsites = getNsitesFromStore(parsed.pubkey, {
						excludeSlug: parsed.identifier,
						includeRoot: isNamedSite
					});
				});

			// Reactively apply profile theme from kind 16767 events
			const themeSub = eventStore
				.filters({ kinds: [16767], authors: [parsed.pubkey] })
				.subscribe((events) => {
					if (!events) return;
					// eventStore.filters returns events; pick the latest
					const allThemeEvents = eventStore.getByFilters({
						kinds: [16767],
						authors: [parsed.pubkey]
					});
					if (allThemeEvents.length === 0) return;

					const latest = allThemeEvents.sort((a, b) => b.created_at - a.created_at)[0];
					const theme = parseActiveProfileTheme(latest);
					if (theme) {
						applyTheme(theme);
					}
				});

			// Reactively read kind 10002 relay list to compute writeRelays for ThemePicker
			const relaysSub = eventStore
				.filters({ kinds: [10002], authors: [parsed.pubkey] })
				.subscribe((event) => {
					if (!event) return;
					const relays = getOutboxes(event);
					writeRelays = relays.length > 0 ? relays : BOOTSTRAP_RELAYS;
				});

			cleanupFns = [
				unsubscribe,
				() => profileSub.unsubscribe(),
				() => nsiteSub.unsubscribe(),
				() => themeSub.unsubscribe(),
				() => relaysSub.unsubscribe(),
				clearTheme,
			];
		});

		return () => {
			for (const fn of cleanupFns) fn();
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
