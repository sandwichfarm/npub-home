import { describe, it, expect, vi } from 'vitest';

// Mock lean-qr before any imports that depend on it
const toCanvasMock = vi.fn();
vi.mock('lean-qr', () => ({
	generate: vi.fn(() => ({ toCanvas: toCanvasMock })),
}));

import { generate } from 'lean-qr';

describe('QR code rendering (AUTH-03, AUTH-04)', () => {
	it('calls generate with the nostrconnect:// URI', () => {
		const uri = 'nostrconnect://testpubkey?relay=wss%3A%2F%2Fbucket.coracle.social';
		const canvas = document.createElement('canvas');
		generate(uri).toCanvas(canvas, { on: [0x8b, 0x5c, 0xf6, 0xff], off: [0, 0, 0, 0], pad: 2 });
		expect(generate).toHaveBeenCalledWith(uri);
		expect(toCanvasMock).toHaveBeenCalledWith(canvas, expect.objectContaining({ pad: 2 }));
	});

	it('toCanvas is called with primary purple color [0x8b, 0x5c, 0xf6, 0xff]', () => {
		const uri = 'nostrconnect://test';
		const canvas = document.createElement('canvas');
		generate(uri).toCanvas(canvas, { on: [0x8b, 0x5c, 0xf6, 0xff], off: [0, 0, 0, 0], pad: 2 });
		expect(toCanvasMock).toHaveBeenCalledWith(
			canvas,
			expect.objectContaining({ on: [0x8b, 0x5c, 0xf6, 0xff] })
		);
	});
});
