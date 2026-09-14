import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/shadcn/empty';

/**
 * 空态（§7 空/错/载三件套之一；本批 §3.8 归位官方 `Empty` 结构）。
 *
 * 归位：官方 `Empty` + `EmptyHeader` + `EmptyDescription`（**结构官方化，形态以官方为准**）；
 * 内距用 className（布局级，官方允许）。**文案与「空态两套文案」策略零变更**（调用点仍只传
 * `message`）。描述字阶随官方 `text-sm`（原 `text-[13px]` 收敛，design §8.7 观感项）。
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
