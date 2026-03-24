import { nip19 } from 'nostr-tools';

export const BOOTSTRAP_RELAYS = [
	'wss://purplepag.es',
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://lunchbox.sandwich.farm'
];

const PUBKEY_B36_LEN = 50;
const NAMED_SITE_REGEX = /^[0-9a-z]{50}[a-z0-9-]{1,13}$/;

export interface ParsedHost {
	npub: string;
	pubkey: string;
	identifier?: string;
}

export function pubkeyToBase36(pubkey: string): string {
	return BigInt('0x' + pubkey)
		.toString(36)
		.padStart(PUBKEY_B36_LEN, '0');
}

export function base36ToPubkey(b36: string): string {
	let n = 0n;
	for (const c of b36) {
		n = n * 36n + BigInt(parseInt(c, 36));
	}
	return n.toString(16).padStart(64, '0');
}

export function parseNpubFromHostname(hostname: string): ParsedHost | null {
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		const devNpub = import.meta.env.VITE_DEV_NPUB;
		if (devNpub) return parseNpubString(devNpub);
		return null;
	}

	const parts = hostname.split('.');

	// Check for npub format (root site: npub1xxx.nsite-host.com)
	for (const part of parts) {
		if (part.startsWith('npub1') && part.length >= 63) {
			const result = parseNpubString(part);
			if (result) return result;
		}
	}

	// Check for base36 named site format (<pubkeyB36><dTag>.nsite-host.com)
	const label = parts[0];
	if (
		label &&
		label.length > PUBKEY_B36_LEN &&
		label.length <= 63 &&
		NAMED_SITE_REGEX.test(label) &&
		!label.endsWith('-')
	) {
		const b36 = label.slice(0, PUBKEY_B36_LEN);
		const dTag = label.slice(PUBKEY_B36_LEN);
		try {
			const pubkey = base36ToPubkey(b36);
			const npub = nip19.npubEncode(pubkey);
			return { npub, pubkey, identifier: dTag };
		} catch {
			// invalid base36
		}
	}

	return null;
}

function parseNpubString(npub: string): ParsedHost | null {
	try {
		const decoded = nip19.decode(npub);
		if (decoded.type === 'npub') {
			return { npub, pubkey: decoded.data };
		}
	} catch {
		// invalid npub
	}
	return null;
}

export function buildSiteUrl(host: string, pubkey: string, slug?: string): string {
	const [hostWithoutPort, port] = host.split(':');
	const parts = hostWithoutPort.split('.');

	// Find base domain (everything after the npub or base36 label)
	let baseDomainIdx = 1;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].startsWith('npub1') && parts[i].length >= 63) {
			baseDomainIdx = i + 1;
			break;
		}
		if (
			i === 0 &&
			parts[i].length > PUBKEY_B36_LEN &&
			NAMED_SITE_REGEX.test(parts[i]) &&
			!parts[i].endsWith('-')
		) {
			baseDomainIdx = 1;
			break;
		}
	}

	const baseDomain = parts.slice(baseDomainIdx).join('.');
	const portSuffix = port ? `:${port}` : '';
	const protocol = port ? 'http' : 'https';

	if (slug) {
		const b36 = pubkeyToBase36(pubkey);
		return `${protocol}://${b36}${slug}.${baseDomain}${portSuffix}`;
	}

	const npub = nip19.npubEncode(pubkey);
	return `${protocol}://${npub}.${baseDomain}${portSuffix}`;
}
