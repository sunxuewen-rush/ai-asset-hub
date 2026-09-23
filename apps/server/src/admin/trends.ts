/**
 * 管理看板趋势 —— 两条累计序列（M4b-6 T1 · 服务端改动 3 · `GET /api/admin/trends?days=N`）。
 *
 * 口径 = 批 design §4.1(b) + §5.1 + D35/D36/D37/D52：
 * - **累计值**（非每日量）：资产 = `count(*) WHERE created_at::date <= d`；下载 = `count(*)` 事件按天累计
 * - **`Asia/Shanghai` 日切**（D35）：日界按上海时区切（**不依赖宿主时区**——`AT TIME ZONE` 显式转换）
 * - 窗口**含今天**共 N 点（D36）：`D-(N-1) … D`
 * - 默认 **30 天**（D37）；越界值 ⇒ **夹到最近档**（`7 / 30 / 180 / 365`，U8 已闭环，**不返 400**）
 * - **`downloads` 两态（D52）**：`download_event` 表**不存在**（迁移 `0014` 未落）⇒ 全部 `null`（前端显「—」）；
 *   表在 ⇒ 数值（空表 / 零下载 ⇒ `0`，前端画 0 线）
 *
 * 实现注记：`download_event` 尚未进 drizzle schema（T3 落表）⇒ 本文件对该表用 **raw SQL**（表结构由 D38 固定 4 列），
 * 避免 T1 依赖 T3 的 schema diff；表存在性用 `to_regclass` 探一次（真实时、无缓存，D54）。
 */
import { count, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset } from '../db/schema/index.js';

/** 可选窗口（与前端选择器四项一致 · D5） */
export const TREND_DAY_CHOICES = [7, 30, 180, 365] as const;
/** 默认窗口（D37） */
export const TREND_DAYS_DEFAULT = 30;
/** 日切时区（D35 —— 与全站一致） */
const TZ = 'Asia/Shanghai';

export interface TrendPoint {
  /** `YYYY-MM-DD`（**上海时区**日界） */
  day: string;
  /** 累计资产数（含窗口前基线） */
  assets: number;
  /** 累计下载次数（事件表未落 ⇒ `null`；表在 ⇒ 数值） */
  downloads: number | null;
}

/** 越界值夹到**最近档**（U8：只读聚合端点，选择器本身只出这 4 档 ⇒ 400 无收益） */
export function clampTrendDays(raw: number): number {
  let best: number = TREND_DAY_CHOICES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const choice of TREND_DAY_CHOICES) {
    const dist = Math.abs(choice - raw);
    if (dist < bestDist) {
      bestDist = dist;
      best = choice;
    }
  }
  return best;
}

/** 上海时区的「今天」= `YYYY-MM-DD`（`en-CA` 输出即 ISO 日期序） */
function shanghaiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 日期推进（以 UTC 为载体：`Asia/Shanghai` 无夏令时 ⇒ 纯日期算术安全） */
function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d) + delta * 86_400_000);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/** `download_event` 表是否存在（迁移 0014 落库判据，D52 两态分支） */
async function hasDownloadEventTable(db: Db): Promise<boolean> {
  const res = (await db.execute(
    sql`select to_regclass('public.download_event') is not null as present`,
  )) as unknown as { rows?: Array<{ present: boolean }> };
  return res.rows?.[0]?.present === true;
}

/** 按天分组的计数（键 = 上海日界的 `YYYY-MM-DD`）；下载侧走 raw SQL（表未进 schema） */
async function downloadsByDay(db: Db): Promise<Map<string, number>> {
  const res = (await db.execute(
    sql`select to_char((created_at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') as day, count(*)::int as n
        from download_event group by 1`,
  )) as unknown as { rows?: Array<{ day: string; n: number }> };
  return new Map((res.rows ?? []).map((r) => [r.day, Number(r.n)]));
}

export async function getAdminTrends(db: Db, days: number): Promise<TrendPoint[]> {
  const n = clampTrendDays(days);
  const today = shanghaiToday();
  const first = shiftDay(today, -(n - 1));
  const windowDays: string[] = [];
  for (let i = 0; i < n; i += 1) windowDays.push(shiftDay(first, i));

  const [assetDayRows, hasEvents] = await Promise.all([
    // 资产按天分组（上海日界）—— 分组用序号引用（`group by 1`），与 select 表达式一致
    db
      .select({
        day: sql<string>`to_char((${asset.createdAt} AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(asset)
      .groupBy(sql`1`),
    hasDownloadEventTable(db),
  ]);
  const downloadDayMap = hasEvents ? await downloadsByDay(db) : null;

  // 累计：窗口前基线 + 窗口内逐日累加（`assets` 累计值语义 —— design §4.1(b)）
  const cut = (map: Map<string, number>): { before: number; inWindow: Map<string, number> } => {
    let before = 0;
    const inWindow = new Map<string, number>();
    for (const [day, cnt] of map) {
      if (day < first) before += cnt;
      else inWindow.set(day, cnt);
    }
    return { before, inWindow };
  };

  const assetMap = new Map(assetDayRows.map((r) => [r.day, Number(r.n)]));
  const assetCut = cut(assetMap);
  const downloadCut = downloadDayMap === null ? null : cut(downloadDayMap);

  let runningAssets = assetCut.before;
  let runningDownloads = downloadCut === null ? 0 : downloadCut.before;

  return windowDays.map((day) => {
    runningAssets += assetCut.inWindow.get(day) ?? 0;
    if (downloadCut !== null) runningDownloads += downloadCut.inWindow.get(day) ?? 0;
    return {
      day,
      assets: runningAssets,
      // D52 两态：表未落 ⇒ null（前端「—」）；表在 ⇒ 数值（含 0）
      downloads: downloadCut === null ? null : runningDownloads,
    };
  });
}
