import type { NostrEvent } from 'nostr-tools';

// ─── Types ───────────────────────────────────────────────────────────

export interface CoreThemeColors {
	background: string; // HSL string, e.g. "228 20% 10%"
	text: string;
	primary: string;
}

export interface ThemeFont {
	family: string;
	url?: string;
}

export interface ThemeBackground {
	url: string;
	mode?: 'cover' | 'tile';
	mimeType?: string;
}

export interface ActiveProfileTheme {
	colors: CoreThemeColors;
	font?: ThemeFont;
	titleFont?: ThemeFont;
	background?: ThemeBackground;
}

export interface ThemeTokens {
	background: string;
	foreground: string;
	card: string;
	cardForeground: string;
	primary: string;
	primaryForeground: string;
	secondary: string;
	secondaryForeground: string;
	muted: string;
	mutedForeground: string;
	border: string;
	destructive: string;
}

// ─── Color Utilities (ported from ditto) ─────────────────────────────

function parseHsl(hsl: string): { h: number; s: number; l: number } {
	const parts = hsl
		.trim()
		.replace(/%/g, '')
		.split(/\s+/)
		.map(Number);
	return { h: parts[0], s: parts[1], l: parts[2] };
}

function formatHsl(h: number, s: number, l: number): string {
	return `${Math.round(h * 10) / 10} ${Math.round(s * 10) / 10}% ${Math.round(l * 10) / 10}%`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	s /= 100;
	l /= 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hexToRgb(hex: string): [number, number, number] {
	hex = hex.replace('#', '');
	if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16)
	];
}

function hexToHslString(hex: string): string {
	const [r, g, b] = hexToRgb(hex);
	const { h, s, l } = rgbToHsl(r, g, b);
	return formatHsl(h, s, l);
}

function getLuminance(r: number, g: number, b: number): number {
	const sRGB = [r, g, b].map((v) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function isDarkTheme(backgroundHsl: string): boolean {
	const { h, s, l } = parseHsl(backgroundHsl);
	const [r, g, b] = hslToRgb(h, s, l);
	return getLuminance(r, g, b) < 0.2;
}

function lighten(hsl: string, amount: number): string {
	const { h, s, l } = parseHsl(hsl);
	return formatHsl(h, s, Math.min(100, l + amount));
}

function darken(hsl: string, amount: number): string {
	const { h, s, l } = parseHsl(hsl);
	return formatHsl(h, s, Math.max(0, l - amount));
}

function contrastForeground(bgHsl: string): string {
	return isDarkTheme(bgHsl) ? '0 0% 100%' : '222.2 84% 4.9%';
}

// ─── Token Derivation (ported from ditto) ────────────────────────────

function deriveTokens(background: string, text: string, primary: string): ThemeTokens {
	const dark = isDarkTheme(background);

	const card = dark ? lighten(background, 2) : background;
	const secondarySurface = dark ? lighten(background, 8) : darken(background, 4);
	const muted = dark ? lighten(background, 8) : darken(background, 4);
	const border = dark
		? formatHsl(parseHsl(primary).h, parseHsl(primary).s * 0.4, 30)
		: formatHsl(parseHsl(primary).h, parseHsl(primary).s * 0.5, 82);

	const fgParsed = parseHsl(text);
	const mutedFg = dark
		? formatHsl(fgParsed.h, Math.max(fgParsed.s - 20, 0), Math.max(fgParsed.l - 30, 40))
		: formatHsl(fgParsed.h, Math.max(fgParsed.s - 30, 0), Math.min(fgParsed.l + 35, 55));

	const primaryFg = contrastForeground(primary);
	const destructive = dark ? '0 72% 51%' : '0 84.2% 60.2%';

	return {
		background,
		foreground: text,
		card,
		cardForeground: text,
		primary,
		primaryForeground: primaryFg,
		secondary: secondarySurface,
		secondaryForeground: text,
		muted,
		mutedForeground: mutedFg,
		border,
		destructive
	};
}

// ─── Event Parsing ───────────────────────────────────────────────────

function parseColorTags(tags: string[][]): CoreThemeColors | null {
	const colorMap = new Map<string, string>();
	for (const tag of tags) {
		if (tag[0] === 'c' && tag[1] && tag[2]) {
			colorMap.set(tag[2], tag[1]);
		}
	}

	const bgHex = colorMap.get('background');
	const textHex = colorMap.get('text');
	const primaryHex = colorMap.get('primary');

	if (!bgHex || !textHex || !primaryHex) return null;

	return {
		background: hexToHslString(bgHex),
		text: hexToHslString(textHex),
		primary: hexToHslString(primaryHex)
	};
}

function parseFontTags(tags: string[][]): { body?: ThemeFont; title?: ThemeFont } {
	const result: { body?: ThemeFont; title?: ThemeFont } = {};
	for (const tag of tags) {
		if (tag[0] !== 'f' || !tag[1]) continue;
		const font: ThemeFont = { family: tag[1] };
		// Format: ["f", "<family>", "<url>", "<role>"]
		// Role is the 4th element (index 3). Legacy tags with no role are treated as "body".
		const role = tag[3] || 'body';
		if (tag[2]) font.url = tag[2];
		if (role === 'title' && !result.title) {
			result.title = font;
		} else if (role === 'body' && !result.body) {
			result.body = font;
		}
	}
	return result;
}

function parseBackgroundTag(tags: string[][]): ThemeBackground | undefined {
	const bgTag = tags.find(([n]) => n === 'bg');
	if (!bgTag) return undefined;

	const kv = new Map<string, string>();
	for (let i = 1; i < bgTag.length; i++) {
		const entry = bgTag[i];
		const spaceIdx = entry.indexOf(' ');
		if (spaceIdx === -1) continue;
		kv.set(entry.slice(0, spaceIdx), entry.slice(spaceIdx + 1));
	}

	const url = kv.get('url');
	if (!url) return undefined;

	const bg: ThemeBackground = { url };
	const mode = kv.get('mode');
	if (mode === 'cover' || mode === 'tile') bg.mode = mode;
	bg.mimeType = kv.get('m');

	return bg;
}

/** Parse a kind 16767 active profile theme event. Returns null if invalid. */
export function parseActiveProfileTheme(event: NostrEvent): ActiveProfileTheme | null {
	if (event.kind !== 16767) return null;

	let colors = parseColorTags(event.tags);

	// Fall back to legacy format: colors as JSON in content
	if (!colors && event.content) {
		try {
			const parsed = JSON.parse(event.content);
			if (parsed.background && parsed.text && parsed.primary) {
				colors = {
					background: String(parsed.background),
					text: String(parsed.text),
					primary: String(parsed.primary)
				};
			} else if (parsed.background && parsed.foreground && parsed.primary) {
				colors = {
					background: String(parsed.background),
					text: String(parsed.foreground),
					primary: String(parsed.primary)
				};
			}
		} catch {
			// Invalid JSON
		}
	}

	if (!colors) return null;

	const fonts = parseFontTags(event.tags);

	return {
		colors,
		font: fonts.body,
		titleFont: fonts.title,
		background: parseBackgroundTag(event.tags)
	};
}

// ─── DOM Application ─────────────────────────────────────────────────

function toVar(key: string): string {
	return `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

function getOrCreateStyle(id: string): HTMLStyleElement {
	let el = document.getElementById(id) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.id = id;
		document.head.appendChild(el);
	}
	return el;
}

/** Apply a parsed theme to the DOM. */
export function applyTheme(theme: ActiveProfileTheme): void {
	const tokens = deriveTokens(theme.colors.background, theme.colors.text, theme.colors.primary);

	// Inject CSS custom properties on :root
	const vars = (Object.entries(tokens) as [string, string][])
		.map(([k, v]) => `${toVar(k)}: ${v};`)
		.join(' ');
	getOrCreateStyle('theme-vars').textContent = `:root { ${vars} }`;

	// Body font (applied globally)
	if (theme.font?.family) {
		let css = '';
		if (theme.font.url) {
			css += `@font-face { font-family: '${theme.font.family}'; src: url('${theme.font.url}'); font-display: swap; }\n`;
		}
		css += `:root { font-family: '${theme.font.family}', system-ui, sans-serif; }`;
		getOrCreateStyle('theme-font').textContent = css;
	}

	// Title font (applied to display name, falls back to body font)
	if (theme.titleFont?.family) {
		let css = '';
		if (theme.titleFont.url) {
			css += `@font-face { font-family: '${theme.titleFont.family}'; src: url('${theme.titleFont.url}'); font-display: swap; }\n`;
		}
		css += `.theme-title-font { font-family: '${theme.titleFont.family}', ${theme.font?.family ? `'${theme.font.family}', ` : ''}system-ui, sans-serif; }`;
		getOrCreateStyle('theme-title-font').textContent = css;
	} else {
		document.getElementById('theme-title-font')?.remove();
	}

	// Background
	if (theme.background?.url) {
		const mode = theme.background.mode || 'cover';
		const bgCss =
			mode === 'tile'
				? `body { background-image: url('${theme.background.url}'); background-repeat: repeat; background-color: hsl(${tokens.background}); }`
				: `body { background-image: url('${theme.background.url}'); background-size: cover; background-position: center; background-attachment: fixed; background-repeat: no-repeat; background-color: hsl(${tokens.background}); }`;
		getOrCreateStyle('theme-background').textContent = bgCss;
	} else {
		getOrCreateStyle('theme-background').textContent = `body { background-color: hsl(${tokens.background}); }`;
	}
}

/** Remove any applied theme (restores CSS defaults from app.css). */
export function clearTheme(): void {
	for (const id of ['theme-vars', 'theme-font', 'theme-title-font', 'theme-background']) {
		document.getElementById(id)?.remove();
	}
}
