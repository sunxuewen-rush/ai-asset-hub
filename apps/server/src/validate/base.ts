/**
 * 族校验公共包装（T5 自检修复：三族 validator 重复包装收敛单点）。
 * 流程：scanZip 结构校验（ZipValidationError → issue 转换在此统一）→ 族检查
 * （族文件只写族规则，不重复 try/catch）。族内新错码校验错误一律返回 ValidationResult
 * （不 throw——校验失败是业务结果，T12 上传端 400 展示 issues）。
 */
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import type { z } from 'zod';
import type { ValidationIssue, ValidationResult } from './types.js';
import { readZipEntry, scanZip, type ZipEntryMeta, ZipValidationError } from './zip.js';

/** 文件扩展名提取（白名单判定共用：点文件 .env → ''——无扩展名语义） */
export function extensionOf(path: string): string {
  const basename = path.split('/').pop() ?? '';
  const idx = basename.lastIndexOf('.');
  return idx > 0 ? basename.slice(idx).toLowerCase() : '';
}

/** 已知结构化错误码集合（schema issue.message = 码的约定校验） */
const KNOWN_ERROR_CODES = new Set<string>(Object.values(protocolErrorCodes));

/**
 * zod schema 错误 → 结构化 issue（07 §4 码义务）。
 * schema message 约定即码（nameSchema/refine 均带码）；zod 基础错（enum/类型）
 * message 是默认文本非码 → 兜底 request.invalid 并保留原文（可诊断）。
 */
export function zodIssuesToValidation(error: z.ZodError, pathPrefix?: string): ValidationIssue[] {
  return error.issues.map((issue) => {
    const issuePath = pathPrefix
      ? [pathPrefix, ...(issue.path ?? [])].join('/')
      : issue.path?.join('.');
    const code = KNOWN_ERROR_CODES.has(issue.message) ? issue.message : 'request.invalid';
    const message = KNOWN_ERROR_CODES.has(issue.message) ? undefined : issue.message;
    return { code, path: issuePath, message };
  });
}

export async function runFamilyValidation(
  zip: Buffer,
  familyCheck: (
    entries: ZipEntryMeta[],
    /** 读取 zip 内单文件内容（族内容校验需要——readZipEntry 封装） */
    readFile: (path: string) => Promise<Buffer>,
  ) => ValidationResult | Promise<ValidationResult>,
): Promise<ValidationResult> {
  try {
    const { entries } = await scanZip(zip);
    return await familyCheck(entries, (path) => readZipEntry(zip, path));
  } catch (err) {
    if (err instanceof ZipValidationError) {
      return { ok: false, errors: [{ code: err.code, path: err.path, message: err.message }] };
    }
    throw err;
  }
}
