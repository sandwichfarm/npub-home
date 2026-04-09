<script lang="ts">
	import ExtensionTab from './LoginModal/ExtensionTab.svelte';
	import RemoteSignerTab from './LoginModal/RemoteSignerTab.svelte';

	let { onClose }: { onClose: () => void } = $props();

	type Tab = 'extension' | 'remote';
	let activeTab = $state<Tab>('extension');

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
	role="presentation"
	onclick={onClose}
>
	<!-- Modal panel — stop click propagation so backdrop click doesn't fire inside -->
	<div
		class="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-label="Log In"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-foreground">Log In</h2>
			<button
				class="text-muted-foreground hover:text-foreground"
				onclick={onClose}
				aria-label="Close"
			>&#x2715;</button>
		</div>

		<!-- Tab bar -->
		<div class="mb-6 flex gap-2 border-b border-border" role="tablist">
			<button
				class="min-h-[44px] px-3 pb-2 text-sm font-medium transition-colors
				       {activeTab === 'extension'
				         ? 'border-b-2 border-primary text-primary'
				         : 'text-muted-foreground hover:text-foreground'}"
				role="tab"
				aria-selected={activeTab === 'extension'}
				onclick={() => (activeTab = 'extension')}
			>Extension</button>
			<button
				class="min-h-[44px] px-3 pb-2 text-sm font-medium transition-colors
				       {activeTab === 'remote'
				         ? 'border-b-2 border-primary text-primary'
				         : 'text-muted-foreground hover:text-foreground'}"
				role="tab"
				aria-selected={activeTab === 'remote'}
				onclick={() => (activeTab = 'remote')}
			>Remote Signer</button>
		</div>

		{#if activeTab === 'extension'}
			<ExtensionTab {onClose} />
		{:else}
			<RemoteSignerTab {onClose} />
		{/if}
	</div>
</div>
