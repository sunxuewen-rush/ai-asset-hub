import { cn } from 'cn';
import { useState } from 'react';

/**
 * 临时评审控件（plan T12；**阶段 0 出口后删除**，勿留进终态）
 *
 * 仅开发环境渲染（本文件内 `import.meta.env.DEV` 守卫 + `main.tsx` 同守卫），默认**关闭**
 * （右下角小按钮唤起）。用途：把「阶段 0 三判」的口径、已定真值、★待拍板项摆在一处，
 * 逐页看时对照，不必翻文档。
 *
 * 纪律：**不做假开关**——没有实现对应变体的档位一律不提供（避免「切了没变化」的误导）。
 */
const JUDGE: Array<[string, string]> = [
  ['气质', '白卡 + 淡蓝底 + 泛蓝细边 + 单一 primary 蓝（无玻璃/无渐变/无光斑）'],
  ['密度', '字阶收敛 9 档；控件按 shadcn 真值（h-9）'],
  ['类型色', 'skill #2563eb / mcp #0e7490 / agent #6d28d9 —— 实底，tile 44px'],
];

const FACTS: Array<[string, string]> = [
  ['顶栏高', '58px（不变）· 白底 + #e3eaf6 下边'],
  ['侧栏', '204px · 底 #f6f9ff · 激活 #eaf1fd'],
  ['hero 主标', '96 / 72 / 52px 三档 · 实底 primary'],
  ['primary', '#1447e6（官方 blue preset 原值）'],
  ['底 / 边 / 环', '#f8faff / #e3eaf6 / #3b82f6'],
  ['圆角轴', 'sm 6 · md 8 · lg 10 · xl 14 · 2xl 18'],
  ['阴影', '卡 shadow-sm · 浮层 shadow-lg（无蓝色投影）'],
  ['hover', '底色变化 bg-muted/50（无位移 / 无投影升）'],
];

const PENDING: string[] = [
  '① 搜索框 / CTA 高度：原 44px → shadcn 真值 h-9（36px）—— 密度可接受？',
  '② 卡片圆角：原 22 / 18 / 16px 收敛到轴上（hero 2xl 18 · 卡 xl 14）—— 观感 OK？',
  '③ 卡片面：现为「白卡 + shadow-sm」无边框，是否加泛蓝细边（border-border）？',
  '④ 类型色实底辨识度（渐变已去，色相未变）—— 一眼能分？',
];

export function ReviewControls() {
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 font-sans">
      {open ? (
        <div className="w-[340px] rounded-xl border border-border bg-popover p-4 text-xs text-popover-foreground shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <b className="text-[13px] font-bold">★ 阶段 0 评审（临时控件）</b>
            <button
              type="button"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              收起
            </button>
          </div>

          <div className="mb-3">
            <div className="mb-1 font-semibold text-muted-foreground">三判</div>
            {JUDGE.map(([k, v]) => (
              <div key={k} className="flex gap-2 py-0.5">
                <b className="w-14 shrink-0">{k}</b>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <div className="mb-1 font-semibold text-muted-foreground">已定真值（design §4.4）</div>
            {FACTS.map(([k, v]) => (
              <div key={k} className="flex gap-2 py-0.5">
                <b className="w-14 shrink-0">{k}</b>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 font-semibold text-warning">★ 待拍板</div>
            {PENDING.map((p) => (
              <div key={p} className="py-0.5 text-muted-foreground">
                {p}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'cursor-pointer rounded-full border border-border bg-popover px-3 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg',
            'hover:bg-muted/60',
          )}
          onClick={() => setOpen(true)}
        >
          ★ 评审
        </button>
      )}
    </div>
  );
}
