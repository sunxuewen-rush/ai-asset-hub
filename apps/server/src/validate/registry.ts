/**
 * 族校验器注册表（M2 design §4/01 §5：type → validator 插拔）。
 * 上传端点按资产 type 取对应校验器（T12 消费）。
 */
import type { AssetType } from '../db/schema/index.js';
import { createAgentValidator } from './agent.js';
import { createMcpValidator } from './mcp.js';
import { createSkillValidator } from './skill.js';
import type { AssetValidator } from './types.js';

/** type → validator 单例注册表（校验器无状态，共享实例） */
export function createValidatorRegistry(): Record<AssetType, AssetValidator> {
  return {
    skill: createSkillValidator(),
    mcp: createMcpValidator(),
    agent: createAgentValidator(),
  };
}

export type ValidatorRegistry = ReturnType<typeof createValidatorRegistry>;
