import buildInfo from './build-info.json';
export function runTask<T>(method: 'generate' | 'png' | 'svg', payload: unknown, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('已取消', 'AbortError')); return; }
    const worker = new Worker(buildInfo.worker, { name: 'bead-processing' });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', cancel); clearTimeout(timeout); };
    const cancel = () => { cleanup(); reject(new DOMException('已取消', 'AbortError')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('处理时间过长，请减小画布或减少图片尺寸后重试。')); }, 120000);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onmessage = ({ data }) => { cleanup(); if (data.error) reject(new Error(data.error)); else resolve(data.result); };
    worker.onerror = () => { cleanup(); reject(new Error('图纸处理程序加载失败，请联网刷新后重试。')); };
    worker.onmessageerror = () => { cleanup(); reject(new Error('未能读取处理结果，请重试。')); };
    try { worker.postMessage({ method, payload }); } catch(e) { cleanup(); reject(e); }
  });
}
