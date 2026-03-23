<script lang="ts">
	let { message = 'Loading...' }: { message?: string } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-4 py-16">
	<div
		class="h-10 w-10 animate-spin rounded-full border-4 border-neutral-600 border-t-purple-500"
	></div>
	<p class="text-sm text-neutral-400">{message}</p>
</div>
