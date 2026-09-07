import { z } from 'zod';

/**
 * 资产类型登记（01 §2）：首期三类，type 是行属性不是唯一键维度。
 */
export const assetTypeSchema = z.enum(['skill', 'mcp', 'agent']);

export type AssetType = z.infer<typeof assetTypeSchema>;
