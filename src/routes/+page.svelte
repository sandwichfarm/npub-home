<script lang="ts">
	import { onMount } from 'svelte';
	import { nip19 } from 'nostr-tools';
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

		const unsubscribe = subscribe(parsed);
		const extraSubs: Array<{ unsubscribe(): void }> = [];
		let profileSub: { unsubscribe(): void } | null = null;
		let nsiteSub: { unsubscribe(): void } | null = null;
		let themeSub: { unsubscribe(): void } | null = null;
		let boundPubkey: string | null = null;

		function cleanupAuthorSubscriptions() {
			profileSub?.unsubscribe();
			nsiteSub?.unsubscribe();
			themeSub?.unsubscribe();
			profileSub = null;
			nsiteSub = null;
			themeSub = null;
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
