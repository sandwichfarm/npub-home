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

	let error = $state<string | null>(null);
	let profile = $state<ProfileContent | undefined>(undefined);
	let nsites = $state<NsiteEntry[]>([]);
	let npub = $state('');
	let host = $state('');
	let pubkey = $state('');

	onMount(() => {
		import('@nsite/stealthis');

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

		return () => {
			unsubscribe();
			profileSub.unsubscribe();
			nsiteSub.unsubscribe();
			themeSub.unsubscribe();
			clearTheme();
		};
	});
</script>

<svelte:head>
	<title>{profile?.display_name || profile?.name || 'nsite'}</title>
</svelte:head>

<div class="min-h-screen text-foreground">
	<div class="mx-auto max-w-2xl py-8">
		{#if error && !profile}
			<ErrorMessage message={error} />
		{:else}
			<div class="overflow-hidden rounded-xl border border-border bg-background">
				<ProfileCard {profile} {npub} />
				<NsiteList {nsites} {host} {pubkey} />
			</div>
			<div class="mt-6 flex justify-center">
				<nsite-deploy label="Steal this nsite"></nsite-deploy>
			</div>
		{/if}
	</div>
</div>
