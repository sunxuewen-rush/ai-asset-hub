import { z } from 'zod';

/**
 * slug 规则（01 §3.3）：`[a-z0-9]([a-z0-9-]*[a-z0-9])?`，长度 1-64，不含连续 `--`。
 * 跨类型唯一坐标 `@namespace/slug` 的 slug 段。
 */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const slugSchema = z
  .string()
  .min(1, 'invalid_slug')
  .max(64, 'invalid_slug')
  .regex(SLUG_REGEX, 'invalid_slug')
  .refine((value) => !value.includes('--'), 'invalid_slug');

export type Slug = z.infer<typeof slugSchema>;

/**
 * 族协议 name 字段（02 §3.1 / 03 §3.1 / 04 §3.1）：
 * kebab-case 规则同 slug，缺失/非法按族协议错误码区分（missing_name / invalid_name）。
 */
export const nameSchema = z
  .string({ required_error: 'missing_name', invalid_type_error: 'invalid_name' })
  .min(1, 'missing_name')
  .max(64, 'invalid_name')
  .regex(SLUG_REGEX, 'invalid_name')
  .refine((value) => !value.includes('--'), 'invalid_name');

/**
 * 族协议 description 字段：非空，≤ 1024（02/03/04）。
 */
export const descriptionSchema = z
  .string({ required_error: 'missing_description', invalid_type_error: 'missing_description' })
  .min(1, 'missing_description')
  .max(1024, 'description_too_long');
