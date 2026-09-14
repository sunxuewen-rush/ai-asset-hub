import { Input } from '@/components/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';

/**
 * 筛选条（design §5.1）：状态下拉 + 关键词输入。
 *
 * 组合 = 官方 `Select` + 官方 `Input`（交互件装原生，零手搓控件）；**粒度与位序由各消费批定**
 * （M4b-3…6），本批只落**最小可用形态**（受控 + 受控）。
 *
 * `value` 约定：`ALL` 表示「全部」（Radix `SelectItem` 不接受空字符串 value ⇒ 用哨兵值），
 * 调用方在提交前把 `ALL` 映射为「不带该参数」。文案全部由调用方传入（i18n 在消费点）。
 */
export const FILTER_ALL = 'ALL';

export function FilterBar({
  statusOptions,
  status,
  onStatusChange,
  statusPlaceholder,
  q,
  onQChange,
  qPlaceholder,
}: {
  statusOptions: Array<{ value: string; label: string }>;
  status: string;
  onStatusChange: (next: string) => void;
  statusPlaceholder: string;
  q: string;
  onQChange: (next: string) => void;
  qPlaceholder: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]" aria-label={statusPlaceholder}>
          <SelectValue placeholder={statusPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={q}
        onChange={(event) => onQChange(event.target.value)}
        placeholder={qPlaceholder}
        aria-label={qPlaceholder}
        className="w-[240px]"
      />
    </div>
  );
}
