<script lang="ts">
	import { logout } from '$lib/auth.svelte';
</script>

<div class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary">
	Logged in as owner
	<button
		class="text-xs font-normal text-muted-foreground underline hover:text-foreground"
		onclick={logout}
	>Log out</button>
</div>
