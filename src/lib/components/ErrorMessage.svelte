<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
	<div class="text-4xl">:(</div>
	<p class="text-lg text-red-400">{message}</p>
</div>
