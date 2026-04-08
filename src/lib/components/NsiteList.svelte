<script lang="ts">
	import type { NsiteEntry } from '$lib/nostr/loaders';
	import { buildSiteUrl, buildSnapshotUrl } from '$lib/nostr/bootstrap';

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

	function siteLabel(nsite: NsiteEntry): string {
		return nsite.title || nsite.slug || 'Root site';
	}
</script>

<div class="px-6 pb-8">
	<h2 class="mb-4 text-lg font-semibold text-muted-foreground">Sites</h2>

	{#if nsites.length === 0}
		<p class="text-center text-sm text-muted-foreground opacity-60">No nsites published yet</p>
	{:else}
		<div class="grid gap-3">
			{#each nsites as nsite}
				{#if nsite.versions.length === 0}
					<a
						href={buildSiteUrl(host, pubkey, nsite.slug)}
						class="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/50 hover:bg-secondary"
					>
						<div>
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<span class="font-medium text-foreground group-hover:text-primary">{siteLabel(nsite)}</span>
								{#if nsite.slug && nsite.title}
									<span class="text-xs text-muted-foreground">{nsite.slug}</span>
								{/if}
								{#if nsite.isRoot}
									<span class="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">root</span>
								{/if}
								<span class="text-xs text-muted-foreground">{formatDate(nsite.createdAt)}</span>
							</div>
							{#if nsite.description}
								<p class="mt-1 text-xs text-muted-foreground">{nsite.description}</p>
							{/if}
						</div>
						<span class="text-muted-foreground transition group-hover:text-primary">&rarr;</span>
					</a>
				{:else}
					<details class="overflow-hidden rounded-lg border border-border bg-card open:border-primary/50">
						<summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
							<div>
								<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
									<span class="font-medium text-foreground">{siteLabel(nsite)}</span>
									{#if nsite.slug && nsite.title}
										<span class="text-xs text-muted-foreground">{nsite.slug}</span>
									{/if}
									{#if nsite.isRoot}
										<span class="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">root</span>
									{/if}
									<span class="text-xs text-muted-foreground">{formatDate(nsite.createdAt)}</span>
								</div>
								{#if nsite.description}
									<p class="mt-1 text-xs text-muted-foreground">{nsite.description}</p>
								{/if}
							</div>
							<div class="text-right text-xs text-muted-foreground">
								<p>{nsite.versions.length} version{nsite.versions.length === 1 ? '' : 's'}</p>
								<p class="mt-1">Expand</p>
							</div>
						</summary>

						<div class="border-t border-border px-4 py-3">
						<a
							href={buildSiteUrl(host, pubkey, nsite.slug)}
							class="group flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 transition hover:border-primary/50 hover:bg-secondary"
						>
							<div>
								<p class="text-sm font-medium text-foreground group-hover:text-primary">Current site</p>
								<p class="text-xs text-muted-foreground">Live manifest updated {formatDate(nsite.createdAt)}</p>
							</div>
							<span class="text-muted-foreground transition group-hover:text-primary">&rarr;</span>
						</a>

							<div class="mt-3 grid gap-2">
								{#each nsite.versions as version}
									<a
										href={buildSnapshotUrl(host, version.id)}
										class="group flex items-center justify-between rounded-md border border-border px-3 py-2 transition hover:border-primary/50 hover:bg-secondary"
									>
										<div>
											<p class="text-sm font-medium text-foreground group-hover:text-primary">
												{version.title || 'Snapshot'}
											</p>
											<p class="text-xs text-muted-foreground">{formatDate(version.createdAt)}</p>
											{#if version.description}
												<p class="mt-1 text-xs text-muted-foreground">{version.description}</p>
											{/if}
										</div>
										<span class="text-muted-foreground transition group-hover:text-primary">&rarr;</span>
									</a>
								{/each}
							</div>
						</div>
					</details>
				{/if}
			{/each}
		</div>
	{/if}
</div>
