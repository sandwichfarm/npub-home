<script lang="ts">
	import { onMount } from 'svelte';
	import { generate } from 'lean-qr';
	import { createNostrConnectSigner, loginWithBunker, finishNostrConnectLogin } from '$lib/auth.svelte';
	import type { NostrConnectSigner } from 'applesauce-signers';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let { onClose }: { onClose: () => void } = $props();

	const DEFAULT_RELAY = 'wss://bucket.coracle.social';

	let relayUrl = $state(DEFAULT_RELAY);
	let bunkerInput = $state('');
	let connecting = $state(false);
	let connectError = $state<string | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);

	// Active signer used for QR flow — recreated when relay changes
	let nostrConnectSigner = $state<NostrConnectSigner | null>(null);
	let nostrConnectUri = $state('');

	function buildQrSigner(relay: string) {
		nostrConnectSigner = createNostrConnectSigner(relay);
		nostrConnectUri = nostrConnectSigner.getNostrConnectURI({ name: 'npub-home' });
		if (canvasEl) renderQr(canvasEl, nostrConnectUri);
	}

	function renderQr(canvas: HTMLCanvasElement, uri: string) {
		generate(uri).toCanvas(canvas, {
			on: [0x8b, 0x5c, 0xf6, 0xff], // primary purple rgba
			off: [0x00, 0x00, 0x00, 0x00], // transparent
			pad: 2,
		});
	}

	onMount(() => {
		buildQrSigner(relayUrl);
	});

	// $effect re-renders QR when canvasEl is bound after mount
	$effect(() => {
		if (canvasEl && nostrConnectUri) {
			renderQr(canvasEl, nostrConnectUri);
		}
	});

	function handleRelayInput() {
		buildQrSigner(relayUrl.trim() || DEFAULT_RELAY);
	}

	async function handleBunkerConnect() {
		if (!bunkerInput.trim()) return;
		connecting = true;
		connectError = null;
		try {
			await loginWithBunker(bunkerInput.trim());
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.toLowerCase().includes('timeout')) {
				connectError = 'Connection timed out. Check the relay and try again.';
			} else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('uri')) {
				connectError = 'Invalid bunker URI. Paste a valid bunker://... address.';
			} else {
				connectError = msg;
			}
		} finally {
			connecting = false;
		}
	}

	// QR flow: begin waiting for approval when user clicks "Waiting for scan"
	// User scans the QR code; remote signer sends approval to our relay
	async function handleQrApproval() {
		if (!nostrConnectSigner) return;
		connecting = true;
		connectError = null;
		try {
			await finishNostrConnectLogin(nostrConnectSigner, relayUrl);
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			connectError = msg.toLowerCase().includes('timeout')
				? 'Connection timed out. Check the relay and try again.'
				: msg;
		} finally {
			connecting = false;
		}
	}
</script>

{#if connecting}
	<LoadingSpinner message="Waiting for approval..." />
{:else}
	<div class="flex flex-col gap-4">
		<!-- Relay field -->
		<div class="flex flex-col gap-1">
			<label for="relay-input" class="text-xs text-muted-foreground">Relay</label>
			<input
				id="relay-input"
				type="url"
				bind:value={relayUrl}
				oninput={handleRelayInput}
				placeholder="wss://bucket.coracle.social"
				class="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm
				       text-foreground placeholder-muted-foreground
				       focus:outline-none focus:ring-2 focus:ring-primary"
			/>
		</div>

		<!-- QR code canvas -->
		<div class="flex flex-col items-center gap-2">
			<p class="text-xs text-muted-foreground">Scan with your signer app</p>
			<canvas
				bind:this={canvasEl}
				aria-label="NIP-46 connection QR code"
				style="image-rendering: pixelated; width: 200px; height: 200px;"
				class="rounded"
			></canvas>
			<button
				class="text-xs text-primary underline hover:opacity-80"
				onclick={handleQrApproval}
			>Waiting for scan... (click to confirm)</button>
		</div>

		<!-- Bunker URI paste -->
		<div class="flex flex-col gap-1">
			<label for="bunker-input" class="text-xs text-muted-foreground">Bunker URI</label>
			<input
				id="bunker-input"
				type="text"
				bind:value={bunkerInput}
				placeholder="bunker://..."
				class="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm
				       text-foreground placeholder-muted-foreground
				       focus:outline-none focus:ring-2 focus:ring-primary"
			/>
			<button
				class="mt-1 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium
				       text-primary-foreground hover:opacity-80 disabled:opacity-50"
				onclick={handleBunkerConnect}
				disabled={!bunkerInput.trim()}
			>Connect</button>
		</div>

		{#if connectError}
			<p class="text-sm text-destructive">{connectError}</p>
		{/if}
	</div>
{/if}
