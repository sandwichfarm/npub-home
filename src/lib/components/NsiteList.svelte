<script lang="ts">
	import type { NsiteEntry } from '$lib/nostr/loaders';
	import { buildSiteUrl } from '$lib/nostr/bootstrap';

	let {
		nsites,
		host,
		pubkey
	}: {
		nsites: NsiteEntry[];
		host: string;
		pubkey: string;
	} = $props();

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="px-6 pb-8">
	<h2 class="mb-4 text-lg font-semibold text-muted-foreground">Sites</h2>

	{#if nsites.length === 0}
		<p class="text-center text-sm text-muted-foreground opacity-60">No nsites published yet</p>
	{:else}
		<div class="grid gap-3">
			{#each nsites as nsite}
				<a
					href={buildSubsiteUrl(host, pubkey, nsite.slug)}
					class="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/50 hover:bg-secondary"
				>
					<div>
						<span class="font-medium text-foreground group-hover:text-primary"
							>{nsite.title || nsite.slug}</span
						>
						{#if nsite.slug && nsite.title}
							<span class="ml-2 text-xs text-muted-foreground">{nsite.slug}</span>
						{/if}
						{#if !nsite.slug}
							<span class="ml-2 text-xs border-primary">root</span>
						{/if}
						<span class="ml-2 text-xs text-muted-foreground">{formatDate(nsite.createdAt)}</span>
						{#if nsite.description}
							<p class="mt-1 text-xs text-muted-foreground">{nsite.description}</p>
						{/if}
					</div>
					<span class="text-muted-foreground transition group-hover:text-primary">&rarr;</span>
				</a>
			{/each}
		</div>
	{/if}
</div>
