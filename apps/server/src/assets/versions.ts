/**
 * 版本上传服务（M2 T12；design §6「先验后落」事务原子性）。
 * 流程：版本冲突预检（409）→ 族校验 + 解析（validatePackage——失败零落库）→
 * 投影（manifest_json/parsed_metadata_json）→ 事务（插版本行 → 写存储逐文件 →
 * 插 asset_file 行 sha256）→ 审计。
 * 原子性语义：校验失败/投影失败发生在事务前——无孤儿行/文件（design §6）；
 * 事务内存储写失败 → DB 回滚干净，已写存储文件容忍孤儿残留（对象存储无事务——
 * 与 T4 删除同纪律，残留可后清）。
 * 权限判定在路由层（T13 与注册同判定：asset:publish 空间成员 + 空间 ACTIVE）——
 * 服务层收授权后输入。
 */
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { assetFile, assetVersion, type AssetType } from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { extractAll } from '../validate/zip.js';
import { validatePackage } from '../validate/index.js';
import { AssetError, assetErrorCodes, UploadValidationError } from './errors.js';
import { projectAsset } from './projection.js';

export interface CreateVersionInput {
  asset: { id: number; namespaceId: number; type: AssetType };
  uploaderId: string;
  /** zip 包体（multipart 前置已界 ≤10MiB——T13） */
  file: Buffer;
  /** 显式版本号（semver 01 §3；UNIQUE(asset_id, version) 防覆写） */
  version: string;
  changelog?: string;
}

export interface CreatedVersion {
  id: number;
  assetId: number;
  version: string;
  status: 'DRAFT';
  fileCount: number;
  totalSize: number;
}

export async function createVersion(
  db: Db,
  storage: ObjectStorage,
  audit: AuditWriter,
  input: CreateVersionInput,
): Promise<CreatedVersion> {
  const { asset: target, uploaderId, file, version, changelog } = input;

  // 1. 版本冲突预检（业务层友好 409；并发兜底在插行 catch 23505）
  // 注意：条件必须 and() 组合——eq(a) && eq(b) 求值为 eq(b)（drizzle 对象 truthy——T14 实证 bug）
  const existing = await db
    .select({ id: assetVersion.id })
    .from(assetVersion)
    .where(and(eq(assetVersion.assetId, target.id), eq(assetVersion.version, version)));
  if (existing.length > 0) throw new AssetError(assetErrorCodes.versionConflict);

  // 2. 族校验 + 解析（失败抛 UploadValidationError——issues 全量给端点 400）
  const validation = await validatePackage(target.type, file);
  if (!validation.ok) throw new UploadValidationError(validation.errors);

  // 3. 投影（manifest_json/parsed_metadata_json）
  const projection = projectAsset(
    target.type,
    validation.validated.manifest,
    validation.validated.body,
  );

  const files = validation.validated.entries.map((e) => e.path).sort();
  const fileCount = files.length;
  const totalSize = validation.validated.entries.reduce((sum, e) => sum + e.size, 0);

  // 4. 事务：插版本行 → 逐文件写存储 + 落 file 行（key = {assetId}/{versionId}/{path}——M1 规则）
  try {
    const versionId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(assetVersion)
        .values({
          assetId: target.id,
          version,
          status: 'DRAFT',
          changelog: changelog ?? null,
          parsedMetadataJson: projection.parsedMetadata as unknown as Record<string, unknown>,
          manifestJson: projection.manifestJson,
          fileCount,
          totalSize,
          createdBy: uploaderId,
        })
        .returning({ id: assetVersion.id });
      const vid = row!.id;

      const contents = await extractAllFor(files, file);
      for (const f of contents) {
        // M1 key 规则（design §6）：{namespaceId}/{assetId}/{versionId}/{path}
        const storageKey = `${target.namespaceId}/${target.id}/${vid}/${f.path}`;
        const sha256 = createHash('sha256').update(f.content).digest('hex');
        await storage.put(storageKey, f.content, { contentType: contentTypeFor(f.path) });
        await tx.insert(assetFile).values({
          versionId: vid,
          filePath: f.path,
          fileSize: f.content.byteLength,
          sha256,
          storageKey,
        });
      }
      return vid;
    });

    // 5. 审计（动作面 asset.version_upload）
    await audit({
      actorId: uploaderId,
      action: 'asset.version_upload',
      targetType: 'asset',
      targetId: String(target.id),
      detail: { version, fileCount, totalSize },
    });

    return { id: versionId, assetId: target.id, version, status: 'DRAFT', fileCount, totalSize };
  } catch (err) {
    // 并发版本冲突兜底（预检后另一请求插入同版本）
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === '23505') throw new AssetError(assetErrorCodes.versionConflict);
    throw err;
  }
}

/** 按 path 从 zip 提取内容（extractAll 后按序匹配——validatePackage 已 scan 通过，内容可解） */
async function extractAllFor(paths: string[], zip: Buffer): Promise<Array<{ path: string; content: Buffer }>> {
  const all = await extractAll(zip);
  const byPath = new Map(all.map((f) => [f.path, f.content]));
  return paths.map((path) => ({ path, content: byPath.get(path)! }));
}

/** 内容类型（白名单扩展名 → mime；未知回落 octet-stream——仅索引元数据用途） */
function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'yaml':
    case 'yml':
      return 'application/yaml';
    case 'js':
      return 'text/javascript';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    case 'sh':
      return 'application/x-sh';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 删除版本（M2 T15；Q2——DRAFT 撤回/治理）。判定在路由层完成（上传者本人/
 * owner/空间 ADMIN+ + DRAFT 检查）——本服务执行清理：事务删 file 行 + 版本行，
 * 事后存储 deleteMany（孤儿文件容忍——与 T4 资产删除同纪律）。
 */
export async function deleteVersion(
  db: Db,
  storage: ObjectStorage,
  audit: AuditWriter,
  input: { versionId: number; assetId: number; actorId: string; version: string },
): Promise<void> {
  const files = await db
    .select({ storageKey: assetFile.storageKey })
    .from(assetFile)
    .where(eq(assetFile.versionId, input.versionId));

  await db.transaction(async (tx) => {
    await tx.delete(assetFile).where(eq(assetFile.versionId, input.versionId));
    await tx.delete(assetVersion).where(eq(assetVersion.id, input.versionId));
  });

  if (files.length > 0) {
    await storage.deleteMany(files.map((f) => f.storageKey));
  }
  await audit({
    actorId: input.actorId,
    action: 'asset.version_delete',
    targetType: 'asset',
    targetId: String(input.assetId),
    detail: { version: input.version, fileCount: files.length },
  });
}
