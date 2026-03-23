<script lang="ts">
	import type { ProfileContent } from 'applesauce-core/helpers/profile';

	let {
		profile,
		npub
	}: {
		profile: ProfileContent | undefined;
		npub: string;
	} = $props();

	const displayName = $derived(
		profile?.display_name || profile?.name || npub.slice(0, 12) + '...'
	);
	const handle = $derived(profile?.name ? `@${profile.name}` : null);
</script>

{#if profile?.banner}
	<div class="h-40 w-full overflow-hidden rounded-t-xl">
		<img src={profile.banner} alt="Banner" class="h-full w-full object-cover" />
	</div>
{/if}

<div class="flex flex-col items-center gap-3 {profile?.banner ? '-mt-12' : 'pt-8'} px-6 pb-6">
	{#if profile?.picture}
		<img
			src={profile.picture}
			alt={displayName}
			class="h-24 w-24 rounded-full border-4 border-neutral-900 object-cover"
		/>
	{:else}
		<div
			class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-neutral-900 bg-purple-800 text-3xl font-bold text-white"
		>
			{displayName.charAt(0).toUpperCase()}
		</div>
	{/if}

	<div class="text-center">
		<h1 class="text-2xl font-bold text-white">{displayName}</h1>
		{#if handle}
			<p class="text-sm text-neutral-400">{handle}</p>
		{/if}
		{#if profile?.nip05}
			<p class="mt-1 text-xs text-purple-400">{profile.nip05}</p>
		{/if}
	</div>

	{#if profile?.about}
		<p class="max-w-md text-center text-sm text-neutral-300">{profile.about}</p>
	{/if}

	{#if profile?.website}
		<a
			href={profile.website}
			target="_blank"
			rel="noopener noreferrer"
			class="text-sm text-purple-400 hover:text-purple-300"
		>
			{profile.website.replace(/^https?:\/\//, '')}
		</a>
	{/if}

	{#if !profile}
		<p class="text-sm text-neutral-500">Profile not found</p>
	{/if}
</div>
