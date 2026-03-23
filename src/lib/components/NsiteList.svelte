<script lang="ts">
	import type { NsiteEntry } from '$lib/nostr/loaders';
	import { buildSubsiteUrl } from '$lib/nostr/bootstrap';

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
	<h2 class="mb-4 text-lg font-semibold text-neutral-300">Sites</h2>

	{#if nsites.length === 0}
		<p class="text-center text-sm text-neutral-500">No nsites published yet</p>
	{:else}
		<div class="grid gap-3">
			{#each nsites as nsite}
				<a
					href={buildSubsiteUrl(host, pubkey, nsite.slug)}
					class="group flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 transition hover:border-purple-500/50 hover:bg-neutral-800"
				>
					<div>
						<span class="font-medium text-white group-hover:text-purple-300"
							>{nsite.title || nsite.slug}</span
						>
						{#if nsite.title}
							<span class="ml-2 text-xs text-neutral-500">{nsite.slug}</span>
						{/if}
						<span class="ml-2 text-xs text-neutral-500">{formatDate(nsite.createdAt)}</span>
						{#if nsite.description}
							<p class="mt-1 text-xs text-neutral-400">{nsite.description}</p>
						{/if}
					</div>
					<span class="text-neutral-500 transition group-hover:text-purple-400">&rarr;</span>
				</a>
			{/each}
		</div>
	{/if}
</div>
