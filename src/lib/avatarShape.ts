/**
 * Avatar shape support — emoji mask for avatars (ported from ditto).
 * Reads the `shape` field from kind 0 profile metadata.
 */

/** Check if a string is likely an emoji (short, non-ASCII). */
function isEmoji(value: string): boolean {
	if (!value || value.length === 0 || value.length > 20) return false;
	// eslint-disable-next-line no-control-regex
	return /[^\x00-\x7F]/.test(value);
}

/** Extract a valid avatar shape emoji from profile metadata. */
export function getAvatarShape(
	metadata: { [key: string]: unknown } | undefined
): string | undefined {
	const raw = metadata?.shape;
	return typeof raw === 'string' && isEmoji(raw) ? raw : undefined;
}

/** In-memory cache: emoji → data-URL. */
const cache = new Map<string, string>();

/**
 * Render an emoji onto a canvas and produce a PNG data-URL alpha mask
 * for use as a CSS `mask-image`.
 *
 * 1. Draw emoji at 512px on oversized scratch canvas
 * 2. Find tight bounding box of non-transparent pixels
 * 3. Square the crop (prevent stretching)
 * 4. Redraw onto 256×256 output canvas
 * 5. Convert to alpha mask (white + original alpha)
 */
export function getEmojiMaskUrl(emoji: string): string {
	const cached = cache.get(emoji);
	if (cached) return cached;

	const fontSize = 512;
	const scratch = fontSize * 1.5;
	const c1 = document.createElement('canvas');
	c1.width = scratch;
	c1.height = scratch;
	const ctx1 = c1.getContext('2d');
	if (!ctx1) return '';

	ctx1.textAlign = 'center';
	ctx1.textBaseline = 'middle';
	ctx1.font = `${fontSize}px serif`;
	ctx1.fillText(emoji, scratch / 2, scratch / 2);

	// Find tight bounding box
	const ALPHA_THRESHOLD = 25;
	const { data: px, width: sw, height: sh } = ctx1.getImageData(0, 0, scratch, scratch);
	let t = sh,
		b = 0,
		l = sw,
		r = 0;
	for (let y = 0; y < sh; y++) {
		for (let x = 0; x < sw; x++) {
			if (px[(y * sw + x) * 4 + 3] > ALPHA_THRESHOLD) {
				if (y < t) t = y;
				if (y > b) b = y;
				if (x < l) l = x;
				if (x > r) r = x;
			}
		}
	}
	if (r < l || b < t) return '';

	// Square the bounding box
	let cropW = r - l + 1;
	let cropH = b - t + 1;
	if (cropW > cropH) {
		const diff = cropW - cropH;
		t -= Math.floor(diff / 2);
		b = t + cropW - 1;
		cropH = cropW;
	} else if (cropH > cropW) {
		const diff = cropH - cropW;
		l -= Math.floor(diff / 2);
		r = l + cropH - 1;
		cropW = cropH;
	}
	if (t < 0) t = 0;
	if (l < 0) l = 0;

	// Redraw cropped onto output canvas
	const out = 256;
	const c2 = document.createElement('canvas');
	c2.width = out;
	c2.height = out;
	const ctx2 = c2.getContext('2d');
	if (!ctx2) return '';

	ctx2.drawImage(c1, l, t, cropW, cropH, 0, 0, out, out);

	// Convert to alpha mask
	const img = ctx2.getImageData(0, 0, out, out);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		d[i] = 255;
		d[i + 1] = 255;
		d[i + 2] = 255;
	}
	ctx2.putImageData(img, 0, 0);

	const url = c2.toDataURL('image/png');
	cache.set(emoji, url);
	return url;
}
