/// <reference lib="webworker" />
import { createPattern } from '../lib/pattern';
import { patternPNG } from '../lib/png';
import { patternSVG } from '../lib/svg-export';
self.onmessage = event => {
  try {
    const { method, payload } = event.data;
    if (method === 'generate') {
      const { colors, ...info } = payload.card;
      self.postMessage({ result: { ...createPattern(payload.raster, payload.options, colors), colorCard: info } });
    } else if (method === 'png') {
      const result = patternPNG(payload); self.postMessage({ result }, { transfer: [result.buffer as ArrayBuffer] });
    } else if (method === 'svg') self.postMessage({ result: patternSVG(payload) });
    else throw new Error('未知操作');
  } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : '图纸处理失败，请重试。' }); }
};
