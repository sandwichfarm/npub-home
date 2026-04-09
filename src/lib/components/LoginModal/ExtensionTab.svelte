<script lang="ts">
	import { loginWithExtension } from '$lib/auth.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let { onClose }: { onClose: () => void } = $props();

	const hasExtension = $derived(
		typeof window !== 'undefined' && typeof (window as Window & { nostr?: unknown }).nostr !== 'undefined'
	);
	let connecting = $state(false);
	let error = $state<string | null>(null);

	async function handleConnect() {
		connecting = true;
		error = null;
		try {
			await loginWithExtension();
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.toLowerCase().includes('missing') || msg.toLowerCase().includes('not found')) {
				error = 'No Nostr extension detected. Install Alby or nos2x to continue.';
			} else if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('rejected')) {
				error = 'Extension denied the request. Try again.';
			} else {
				error = msg;
			}
		} finally {
			connecting = false;
		}
	}
</script>

{#if connecting}
	<LoadingSpinner message="Connecting..." />
{:else}
	<div class="flex flex-col gap-4">
		<button
			class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
			       hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
			onclick={handleConnect}
			disabled={!hasExtension}
			aria-disabled={!hasExtension}
			title={hasExtension ? undefined : 'No extension detected'}
		>Connect Extension</button>

		{#if !hasExtension}
			<p class="text-xs text-muted-foreground">No extension detected</p>
		{/if}

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	</div>
{/if}
