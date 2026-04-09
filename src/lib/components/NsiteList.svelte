<script lang="ts">
	import type { NsiteEntry } from '$lib/nostr/loaders';
	import type { RelayPool } from 'applesauce-relay';
	import type { EventSigner } from 'applesauce-core/event-factory';
	import { EventFactory } from 'applesauce-core/event-factory';
	import { buildSiteUrl, buildSnapshotUrl, BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';

	// --- Props ---

	let {
		nsites,
		host,
		pubkey,
		isOwner = false,
		signer,
		pool,
		writeRelays = []
	}: {
		nsites: NsiteEntry[];
		host: string;
		pubkey: string;
		isOwner?: boolean;
		signer?: EventSigner;
		pool?: RelayPool;
		writeRelays?: string[];
	} = $props();

	// --- Types ---

	type RowMode = 'view' | 'editing' | 'confirm-delete' | 'saving' | 'deleting' | 'deleted';

	// --- Per-entry row state ---

	let rowModes = $state<Record<string, RowMode>>({});
	let editValues = $state<Record<string, { title: string; description: string }>>({});
	let errorMessages = $state<Record<string, string>>({});
	let deletedKeys = $state<Set<string>>(new Set());

	// --- Helpers ---

	function nsiteKey(nsite: NsiteEntry): string {
		return nsite.slug ?? '__root__';
	}

	function getMode(nsite: NsiteEntry): RowMode {
		return rowModes[nsiteKey(nsite)] ?? 'view';
	}

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

	// --- Edit handlers ---

	function openEdit(nsite: NsiteEntry) {
		const key = nsiteKey(nsite);
		editValues = {
			...editValues,
			[key]: { title: nsite.title ?? nsite.slug ?? '', description: nsite.description ?? '' }
		};
		rowModes = { ...rowModes, [key]: 'editing' };
		errorMessages = { ...errorMessages, [key]: '' };
	}

	function cancelEdit(nsite: NsiteEntry) {
		const key = nsiteKey(nsite);
		rowModes = { ...rowModes, [key]: 'view' };
		errorMessages = { ...errorMessages, [key]: '' };
	}

	async function saveEdit(nsite: NsiteEntry) {
		if (!nsite.sourceEvent || !signer || !pool) return;
		const key = nsiteKey(nsite);
		rowModes = { ...rowModes, [key]: 'saving' };
		errorMessages = { ...errorMessages, [key]: '' };
		try {
			const factory = new EventFactory({ signer });
			const vals = editValues[key];
			const template = await factory.modify(nsite.sourceEvent, (draft) => {
				const otherTags = draft.tags.filter((t) => t[0] !== 'title' && t[0] !== 'description');
				return {
					...draft,
					tags: [
						...otherTags,
						...(vals.title ? [['title', vals.title]] : []),
						...(vals.description ? [['description', vals.description]] : [])
					]
				};
			});
			const signed = await factory.sign(template);
			const targets = writeRelays.length > 0 ? writeRelays : BOOTSTRAP_RELAYS;
			await pool.publish(targets, signed);
			rowModes = { ...rowModes, [key]: 'view' };
		} catch {
			rowModes = { ...rowModes, [key]: 'editing' };
			errorMessages = {
				...errorMessages,
				[key]: 'Failed to save. Check your connection and try again.'
			};
		}
	}

	// --- Delete handlers ---

	function openConfirmDelete(nsite: NsiteEntry) {
		const key = nsiteKey(nsite);
		rowModes = { ...rowModes, [key]: 'confirm-delete' };
		errorMessages = { ...errorMessages, [key]: '' };
	}

	function cancelDelete(nsite: NsiteEntry) {
		const key = nsiteKey(nsite);
		rowModes = { ...rowModes, [key]: 'view' };
		errorMessages = { ...errorMessages, [key]: '' };
	}

	async function requestDeletion(nsite: NsiteEntry) {
		if (!nsite.sourceEvent || !signer || !pool) return;
		const key = nsiteKey(nsite);
		rowModes = { ...rowModes, [key]: 'deleting' };
		errorMessages = { ...errorMessages, [key]: '' };
		try {
			const factory = new EventFactory({ signer });
			// Dynamic import avoids vi.mock hoisting temporal dead zone in tests
			const { setDeleteEvents } = await import('applesauce-core/operations/delete');
			const template = await factory.build(
				{ kind: 5, content: '' },
				setDeleteEvents([nsite.sourceEvent!])
			);
			const signed = await factory.sign(template);
			const targets = writeRelays.length > 0 ? writeRelays : BOOTSTRAP_RELAYS;
			await pool.publish(targets, signed);
			rowModes = { ...rowModes, [key]: 'deleted' };
			deletedKeys = new Set([...deletedKeys, key]);
		} catch {
			rowModes = { ...rowModes, [key]: 'confirm-delete' };
			errorMessages = {
				...errorMessages,
				[key]: 'Failed to request deletion. Check your connection and try again.'
			};
		}
	}
</script>

<div class="px-6 pb-8">
	<h2 class="mb-4 text-lg font-semibold text-muted-foreground">Sites</h2>

	{#if nsites.length === 0}
		<p class="text-center text-sm text-muted-foreground opacity-60">No nsites published yet</p>
	{:else}
		<div class="grid gap-3">
			{#each nsites as nsite (nsiteKey(nsite))}
				{@const key = nsiteKey(nsite)}
				{@const mode = getMode(nsite)}

				{#if deletedKeys.has(key)}
					<!-- Deletion requested indicator -->
					<div
						class="rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground opacity-60"
					>
						Deletion requested
					</div>
				{:else if mode === 'editing' || mode === 'saving'}
					<!-- Inline edit form -->
					<div class="rounded-lg border border-border bg-card px-4 py-3">
						<div class="flex flex-col gap-2">
							<input
								type="text"
								class="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
								placeholder="Name"
								value={editValues[key]?.title ?? ''}
								oninput={(e) => {
									editValues = {
										...editValues,
										[key]: {
											...editValues[key],
											title: (e.target as HTMLInputElement).value
										}
									};
								}}
								disabled={mode === 'saving'}
							/>
							<textarea
								class="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
								placeholder="Description"
								rows={2}
								value={editValues[key]?.description ?? ''}
								oninput={(e) => {
									editValues = {
										...editValues,
										[key]: {
											...editValues[key],
											description: (e.target as HTMLTextAreaElement).value
										}
									};
								}}
								disabled={mode === 'saving'}
							></textarea>
							<div class="flex items-center gap-2">
								<button
									class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
									onclick={() => saveEdit(nsite)}
									disabled={mode === 'saving'}
								>
									{mode === 'saving' ? 'Saving...' : 'Save'}
								</button>
								<button
									class="text-xs text-muted-foreground underline ml-2"
									onclick={() => cancelEdit(nsite)}
									disabled={mode === 'saving'}
								>
									Cancel
								</button>
							</div>
							{#if errorMessages[key]}
								<p class="text-xs text-destructive">{errorMessages[key]}</p>
							{/if}
						</div>
					</div>
				{:else if mode === 'confirm-delete' || mode === 'deleting'}
					<!-- Inline delete confirmation -->
					<div class="rounded-lg border border-border bg-card px-4 py-3">
						<p class="text-sm text-foreground mb-2">Request deletion? This is best-effort.</p>
						<div class="flex items-center gap-2">
							<button
								class="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded disabled:opacity-50"
								onclick={() => requestDeletion(nsite)}
								disabled={mode === 'deleting'}
							>
								{mode === 'deleting' ? 'Deleting...' : 'Delete'}
							</button>
							<button
								class="text-xs text-muted-foreground underline ml-2"
								onclick={() => cancelDelete(nsite)}
								disabled={mode === 'deleting'}
							>
								Cancel
							</button>
						</div>
						{#if errorMessages[key]}
							<p class="text-xs text-destructive mt-1">{errorMessages[key]}</p>
						{/if}
					</div>
				{:else if nsite.versions.length === 0}
					<!-- View mode: no versions — simple row with optional management icons -->
					<div
						class="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/50 hover:bg-secondary"
					>
						<a href={buildSiteUrl(host, pubkey, nsite.slug)} class="flex-1 min-w-0">
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
						</a>
						<div class="flex items-center gap-1 ml-2">
							{#if isOwner}
								<button
									class="ml-2 text-muted-foreground hover:text-foreground text-sm"
									onclick={() => openEdit(nsite)}
									title="Edit nsite"
									aria-label="Edit nsite"
								>&#x270F;</button>
								<button
									class="ml-2 text-muted-foreground hover:text-foreground text-sm"
									onclick={() => openConfirmDelete(nsite)}
									title="Delete nsite"
									aria-label="Delete nsite"
								>&#x1F5D1;</button>
							{/if}
							<span class="text-muted-foreground transition group-hover:text-primary">&rarr;</span>
						</div>
					</div>
				{:else}
					<!-- View mode: has versions — expandable details with management icons -->
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
							<div class="flex items-center gap-2">
								{#if isOwner}
									<button
										class="text-muted-foreground hover:text-foreground text-sm"
										onclick={(e) => { e.preventDefault(); openEdit(nsite); }}
										title="Edit nsite"
										aria-label="Edit nsite"
									>&#x270F;</button>
									<button
										class="text-muted-foreground hover:text-foreground text-sm"
										onclick={(e) => { e.preventDefault(); openConfirmDelete(nsite); }}
										title="Delete nsite"
										aria-label="Delete nsite"
									>&#x1F5D1;</button>
								{/if}
								<div class="text-right text-xs text-muted-foreground">
									<p>{nsite.versions.length} version{nsite.versions.length === 1 ? '' : 's'}</p>
									<p class="mt-1">Expand</p>
								</div>
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
