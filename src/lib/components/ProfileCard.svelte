<script lang="ts">
	import type { ProfileContent } from 'applesauce-core/helpers/profile';
	import { getAvatarShape, getEmojiMaskUrl } from '$lib/avatarShape';

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
	const shape = $derived(getAvatarShape(profile as { [key: string]: unknown } | undefined));
	const maskUrl = $derived(shape ? getEmojiMaskUrl(shape) : null);

	const maskStyle = $derived(
		maskUrl
			? `-webkit-mask-image: url(${maskUrl}); mask-image: url(${maskUrl}); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center;`
			: ''
	);

	const borderStyle = $derived(
		maskUrl
			? 'filter: drop-shadow(3px 0 0 hsl(var(--background))) drop-shadow(-3px 0 0 hsl(var(--background))) drop-shadow(0 3px 0 hsl(var(--background))) drop-shadow(0 -3px 0 hsl(var(--background)));'
			: ''
	);
</script>

{#if profile?.banner}
	<div class="h-40 w-full overflow-hidden rounded-t-xl">
		<img src={profile.banner} alt="Banner" class="h-full w-full object-cover" />
	</div>
{/if}

<div class="flex flex-col items-center gap-3 {profile?.banner ? '-mt-12' : 'pt-8'} px-6 pb-6">
	{#if profile?.picture}
		<div style={borderStyle}>
			<img
				src={profile.picture}
				alt={displayName}
				class="h-24 w-24 object-cover {maskUrl ? '' : 'rounded-full border-4 border-background'}"
				style={maskStyle}
			/>
		</div>
	{:else}
		<div
			class="flex h-24 w-24 items-center justify-center bg-primary text-3xl font-bold text-primary-foreground {maskUrl ? '' : 'rounded-full border-4 border-background'}"
			style="{maskStyle}{borderStyle}"
		>
			{displayName.charAt(0).toUpperCase()}
		</div>
	{/if}

	<div class="text-center">
		<h1 class="text-2xl font-bold text-foreground">{displayName}</h1>
		{#if handle}
			<p class="text-sm text-muted-foreground">{handle}</p>
		{/if}
		{#if profile?.nip05}
			<p class="mt-1 text-xs text-primary">{profile.nip05}</p>
		{/if}
	</div>

	{#if profile?.about}
		<p class="max-w-md text-center text-sm text-muted-foreground">{profile.about}</p>
	{/if}

	{#if profile?.website}
		<a
			href={profile.website}
			target="_blank"
			rel="noopener noreferrer"
			class="text-sm text-primary hover:opacity-80"
		>
			{profile.website.replace(/^https?:\/\//, '')}
		</a>
	{/if}

	{#if !profile}
		<p class="text-sm text-muted-foreground">Profile not found</p>
	{/if}
</div>
