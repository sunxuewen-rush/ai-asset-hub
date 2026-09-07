// 协议 schema 单源（01 §6）：slug/类型/错误码 + 三族 manifest
export * from './slug.js';
export * from './type.js';
export * from './errors.js';
export * from './skill/manifest.js';
export * from './mcp/manifest.js';
export * from './agent/manifest.js';

export const protocolVersion = '0.1.0';
