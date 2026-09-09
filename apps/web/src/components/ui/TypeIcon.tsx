import type { ReactNode } from 'react';
import type { AssetType } from '../../api/types.js';

/** 类型图标（design §4.4：skill 扳手 / mcp 互锁链（Clean Room 自绘——MCP 造型）/ agent 人像；
 *  path 取自已拍板 styleboard（demo-m4a.html + cd-polish-home.html），currentColor 描边随上下文变色） */
const TYPE_SVG: Record<AssetType, { viewBox: string; strokeWidth: number; node: ReactNode }> = {
  // lucide wrench（demo-m4a ICONS.skill）
  skill: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    node: (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />
    ),
  },
  // MCP 互锁链（自绘——cd-polish-home.html tc-ic.mcp）
  mcp: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.7,
    node: (
      <>
        <path d="M0.97 9.37L9.52 1.6c1.18-1.07 3.1-1.07 4.28 0 1.18 1.07 1.18 2.81 0 3.89L7.34 11.36" />
        <path d="M7.43 11.27l6.37-5.79c1.18-1.07 3.1-1.07 4.27 0l.05.04c1.18 1.07 1.18 2.81 0 3.89l-7.73 7.03c-.39.36-.39.94 0 1.3l1.59 1.44" />
        <path d="M11.66 3.54L5.34 9.29c-1.18 1.07-1.18 2.81 0 3.89 1.18 1.07 3.1 1.07 4.27 0l6.32-5.75" />
      </>
    ),
  },
  // lucide user（demo-m4a ICONS.agent——专家人像）
  agent: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    node: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
};

export function TypeIcon({ type, size = 16 }: { type: AssetType; size?: number }) {
  const { viewBox, strokeWidth, node } = TYPE_SVG[type];
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {node}
    </svg>
  );
}
