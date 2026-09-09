import { useEffect, useState } from 'react';
import { ApiError } from '../api/client.js';

export interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

const INITIAL = { data: null, error: null, loading: true };

/**
 * useApi 三态编排（design §7：三态 + abort + 语言感知缓存[apiGet 层]）。
 * loader 每次渲染重建，effect 以 deps 决定是否重发——deps 变化 → 替换式清旧数据
 * （分页/搜索替换式纪律），竞态以 AbortController + alive 守卫终止。
 */
export function useApi<T>(loader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<UseApiState<T>>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setState(INITIAL);
    loader(controller.signal)
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === 'AbortError') return; // 竞态终止非错误
        setState({
          data: null,
          error: err instanceof ApiError ? err : new ApiError('network', 0),
          loading: false,
        });
      });
    return () => {
      alive = false;
      controller.abort();
    };
    // 通用 hook——loader/deps 由调用方显式传入（useApi(loader, [q,page]) 参数化重发语义），
    // biome-ignore lint/correctness/useExhaustiveDependencies: 闭包变量 loader 非本文件字面量，静态规则不适用
  }, deps);

  return state;
}
