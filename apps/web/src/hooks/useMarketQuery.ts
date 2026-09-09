import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEBOUNCE_MS = 300;

export interface MarketQuery {
  /** 即时搜索草稿（输入框绑定值——回退/前进/分享还原时随 URL 同步） */
  q: string;
  setQ: (next: string) => void;
  /** 已提交的 q（URL 现值）——列表拉取以此为准（防抖后写 URL 才发请求） */
  committedQ: string;
  /** label 多值 OR（URL 重复 label= 参数；06/§5.1） */
  labels: readonly string[];
  toggleLabel: (label: string) => void;
  clearLabels: () => void;
  /** 页码（1-based；?page= ——offset 换算由消费方按 limit 做） */
  page: number;
  setPage: (next: number) => void;
}

/**
 * 市场查询 URL 状态 hook（design §7：搜索防抖 300ms 写 URL；?q/?label（多值 OR）/?page ↔
 * 参数同步——回退/分享还原）。label/page 即时写（点选/翻页即状态）；q 输入 300ms 防抖 +
 * replace 写（防历史垃圾）。外部 URL 变化（回退/前进）→ 草稿与列表参数同步刷新。
 */
export function useMarketQuery(): MarketQuery {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const urlLabels = params.getAll('label');
  const urlPage = Math.max(1, Number(params.get('page')) || 1);

  const [draft, setDraft] = useState(urlQ);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部 URL 变化（回退/前进/分享链接）→ 草稿同步（防输入框与 URL 脱节）
  useEffect(() => {
    setDraft(urlQ);
  }, [urlQ]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function commit(next: URLSearchParams) {
    setParams(next, { replace: true });
  }

  /** 过滤变更即回到第一页（URL 去 page 参数——防旧页越界空态，M4a 终审 🟡1） */
  function dropPage(p: URLSearchParams): URLSearchParams {
    p.delete('page');
    return p;
  }

  function setQ(next: string) {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const p = new URLSearchParams(params);
      if (next.trim()) p.set('q', next.trim());
      else p.delete('q');
      commit(dropPage(p));
    }, DEBOUNCE_MS);
  }

  function toggleLabel(label: string) {
    const p = new URLSearchParams(params);
    const all = p.getAll('label');
    const next = all.includes(label) ? all.filter((l) => l !== label) : [...all, label];
    p.delete('label');
    for (const l of next) p.append('label', l);
    commit(dropPage(p));
  }

  function clearLabels() {
    const p = new URLSearchParams(params);
    p.delete('label');
    commit(dropPage(p));
  }

  function setPage(next: number) {
    const p = new URLSearchParams(params);
    if (next > 1) p.set('page', String(next));
    else p.delete('page');
    commit(p);
  }

  return {
    q: draft,
    setQ,
    committedQ: urlQ,
    labels: urlLabels,
    toggleLabel,
    clearLabels,
    page: urlPage,
    setPage,
  };
}
