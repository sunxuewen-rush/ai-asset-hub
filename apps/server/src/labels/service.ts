/**
 * label 域服务（M3 design §5 R11；06 §1-§6 契约落地——定义 CRUD/排序/公开列表）。
 * 权限：定义 CRUD 仅 SUPER_ADMIN（06 §3——路由层判）；挂载面在 T11（canManageAsset 分判）。
 * 两级树：slug 全局唯一；parentId DB 存内部 id、API 层按 slug 解析/回传（06 §2.1/§5.1）。
 * 级联：删 definition → 翻译/挂载 ON DELETE CASCADE（06 §2 表结构）；「搜索文档重建」
 * 句在 AIH 消化掉（无独立搜索索引——design §5 R11：挂载实时 join，删 label 无需重建）。
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import {
  assetLabel,
  type LabelType,
  labelDefinition,
  labelTranslation,
} from '../db/schema/index.js';
import { LabelError, labelErrorCodes } from './errors.js';

/** slug 全局唯一公开标识（06 §2.1 kebab-case ≤64） */
export const labelSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'label slug must be kebab-case')
  .max(64);

/** 翻译输入（06 §2.3——locale → display_name；locale UNIQUE(label_id, locale) upsert） */
export const translationInputSchema = z.array(
  z.object({
    locale: z.string().min(2).max(16),
    displayName: z.string().min(1).max(128),
  }),
);

interface LabelRow {
  id: number;
  slug: string;
  type: LabelType;
  visibleInFilter: boolean;
  sortOrder: number;
  parentId: number | null;
  createdBy: string | null;
}

export interface PublicLabel {
  slug: string;
  type: LabelType;
  /** 父级 slug（06 §5.1——String 公开标识，非内部 id） */
  parentId: string | null;
  displayName: string;
}

/** 管理面完整行（含翻译全量——编辑需要） */
export interface ManagedLabel extends LabelRow {
  translations: Array<{ locale: string; displayName: string }>;
}

async function loadBySlug(db: Db, slug: string): Promise<LabelRow> {
  const [row] = await db
    .select({
      id: labelDefinition.id,
      slug: labelDefinition.slug,
      type: labelDefinition.type,
      visibleInFilter: labelDefinition.visibleInFilter,
      sortOrder: labelDefinition.sortOrder,
      parentId: labelDefinition.parentId,
      createdBy: labelDefinition.createdBy,
    })
    .from(labelDefinition)
    .where(eq(labelDefinition.slug, slug));
  if (!row) throw new LabelError(labelErrorCodes.notFound);
  return row;
}

/** 翻译按 label 批量读（定义 CRUD/编辑共用） */
async function translationsOf(
  db: Db,
  labelIds: number[],
): Promise<Map<number, Array<{ locale: string; displayName: string }>>> {
  if (labelIds.length === 0) return new Map();
  const rows = await db
    .select({
      labelId: labelTranslation.labelId,
      locale: labelTranslation.locale,
      displayName: labelTranslation.displayName,
    })
    .from(labelTranslation)
    .where(inArray(labelTranslation.labelId, labelIds));
  const map = new Map<number, Array<{ locale: string; displayName: string }>>();
  for (const r of rows) {
    const list = map.get(r.labelId) ?? [];
    list.push({ locale: r.locale, displayName: r.displayName });
    map.set(r.labelId, list);
  }
  return map;
}

/**
 * 锁两级树校验（06 §5.2）：parent 必须是一级分类；不能挂二级之下；不能自指；
 * 一级不可降级（设 parent）；二级可换域。返回解析后的父级 id（null = 一级）。
 */
async function resolveParent(
  db: Db,
  parentSlug: string | null | undefined,
  currentSlug?: string,
): Promise<number | null> {
  if (parentSlug === null || parentSlug === undefined || parentSlug === '') return null;
  const parent = await loadBySlug(db, parentSlug); // parent 不存在 → label.not_found
  if (parent.slug === currentSlug) throw new LabelError(labelErrorCodes.invalidParent); // 自指
  if (parent.parentId !== null) throw new LabelError(labelErrorCodes.invalidParent); // parent 非一级（挂二级之下）
  return parent.id;
}

export interface CreateLabelInput {
  slug: string;
  type: LabelType;
  visibleInFilter?: boolean;
  sortOrder?: number;
  parentSlug?: string | null;
  translations?: Array<{ locale: string; displayName: string }>;
  createdBy: string;
}

export async function createLabel(
  db: Db,
  audit: AuditWriter,
  input: CreateLabelInput,
): Promise<ManagedLabel> {
  const slug = input.slug.trim();
  if (!labelSlugSchema.safeParse(slug).success)
    throw new LabelError(labelErrorCodes.invalidParent, 'invalid slug'); // 复用码？slug 格式错用 request.invalid 更贴——路由层校验；此处防御
  const parentId = await resolveParent(db, input.parentSlug);

  try {
    const created = await db.transaction(async (tx) => {
      const [def] = await tx
        .insert(labelDefinition)
        .values({
          slug,
          type: input.type,
          visibleInFilter: input.visibleInFilter ?? true,
          sortOrder: input.sortOrder ?? 0,
          parentId,
          createdBy: input.createdBy,
        })
        .returning({
          id: labelDefinition.id,
          slug: labelDefinition.slug,
          type: labelDefinition.type,
          visibleInFilter: labelDefinition.visibleInFilter,
          sortOrder: labelDefinition.sortOrder,
          parentId: labelDefinition.parentId,
          createdBy: labelDefinition.createdBy,
        });
      if (input.translations && input.translations.length > 0) {
        await tx
          .insert(labelTranslation)
          .values(
            input.translations.map((t) => ({
              labelId: def!.id,
              locale: t.locale,
              displayName: t.displayName,
            })),
          );
      }
      return { def: def!, translations: input.translations ?? [] };
    });

    await audit({
      actorId: input.createdBy,
      action: 'label.create',
      targetType: 'label_definition',
      targetId: String(created.def.id),
      detail: { slug, type: input.type, parentSlug: input.parentSlug ?? null },
    });
    return { ...created.def, translations: created.translations };
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === '23505') throw new LabelError(labelErrorCodes.slugTaken);
    throw err;
  }
}

export interface UpdateLabelInput {
  slug: string;
  actorId: string;
  type?: LabelType;
  visibleInFilter?: boolean;
  sortOrder?: number;
  /** undefined = 不动父级；null/'' = 降为一级（二级可换域/降级？06 §5.2 二级可换域——一级不可降级指原一级不能有 parent；原二级设 null 合法） */
  parentSlug?: string | null;
  /** 提供时按 locale upsert（不删未列 locale——增量保守） */
  translations?: Array<{ locale: string; displayName: string }>;
}

export async function updateLabel(
  db: Db,
  audit: AuditWriter,
  input: UpdateLabelInput,
): Promise<ManagedLabel> {
  const existing = await loadBySlug(db, input.slug);
  // 一级不可降级（06 §5.2：原一级 + 新 parentSlug 非空 → 拒）
  if (existing.parentId === null && input.parentSlug && input.parentSlug !== '') {
    throw new LabelError(labelErrorCodes.invalidParent);
  }
  const parentId =
    input.parentSlug === undefined
      ? existing.parentId
      : await resolveParent(db, input.parentSlug, input.slug);

  await db.transaction(async (tx) => {
    await tx
      .update(labelDefinition)
      .set({
        type: input.type ?? existing.type,
        visibleInFilter: input.visibleInFilter ?? existing.visibleInFilter,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        parentId,
        updatedAt: new Date(),
      })
      .where(eq(labelDefinition.id, existing.id));

    if (input.translations && input.translations.length > 0) {
      for (const t of input.translations) {
        await tx
          .insert(labelTranslation)
          .values({ labelId: existing.id, locale: t.locale, displayName: t.displayName })
          .onConflictDoUpdate({
            target: [labelTranslation.labelId, labelTranslation.locale],
            set: { displayName: t.displayName, updatedAt: new Date() },
          });
      }
    }
  });

  await audit({
    actorId: input.actorId,
    action: 'label.update',
    targetType: 'label_definition',
    targetId: String(existing.id),
    detail: {
      slug: input.slug,
      changed: Object.keys(input).filter(
        (k) => k !== 'slug' && k !== 'actorId' && input[k as keyof UpdateLabelInput] !== undefined,
      ),
    },
  });
  return {
    ...existing,
    ...(await loadBySlug(db, input.slug)),
    translations: (await translationsOf(db, [existing.id])).get(existing.id) ?? [],
  };
}

/** 删除（带子级拒——06 §5.2；翻译/挂载 cascade；无搜索重建——design R11） */
export async function deleteLabel(
  db: Db,
  audit: AuditWriter,
  input: { slug: string; actorId: string },
): Promise<void> {
  const existing = await loadBySlug(db, input.slug);
  const [child] = await db
    .select({ id: labelDefinition.id })
    .from(labelDefinition)
    .where(eq(labelDefinition.parentId, existing.id))
    .limit(1);
  if (child) throw new LabelError(labelErrorCodes.parentHasChildren);

  await db.delete(labelDefinition).where(eq(labelDefinition.id, existing.id));
  await audit({
    actorId: input.actorId,
    action: 'label.delete',
    targetType: 'label_definition',
    targetId: String(existing.id),
    detail: { slug: input.slug },
  });
}

/** 批量排序（一级/二级各自排——06 §5.2；入参顺序表 {slug, sortOrder}） */
export async function reorderLabels(
  db: Db,
  audit: AuditWriter,
  input: { order: Array<{ slug: string; sortOrder: number }>; actorId: string },
): Promise<void> {
  if (input.order.length === 0) return;
  const slugs = input.order.map((o) => o.slug);
  const defs = await db
    .select({ id: labelDefinition.id, slug: labelDefinition.slug })
    .from(labelDefinition)
    .where(inArray(labelDefinition.slug, slugs));
  const bySlug = new Map(defs.map((d) => [d.slug, d.id]));
  for (const item of input.order) {
    const id = bySlug.get(item.slug);
    if (!id) throw new LabelError(labelErrorCodes.notFound);
    await db
      .update(labelDefinition)
      .set({ sortOrder: item.sortOrder })
      .where(eq(labelDefinition.id, id));
  }
  await audit({
    actorId: input.actorId,
    action: 'label.reorder',
    targetType: 'label_definition',
    targetId: input.order.map((o) => o.slug).join(','),
    detail: { count: input.order.length },
  });
}

/** 公开列表（06 §5.1：RECOMMENDED + visible_in_filter；扁平 + parentId slug + displayName 回退） */
export async function listPublicLabels(db: Db, locale: string): Promise<PublicLabel[]> {
  const defs = await db
    .select({
      id: labelDefinition.id,
      slug: labelDefinition.slug,
      type: labelDefinition.type,
      visibleInFilter: labelDefinition.visibleInFilter,
      sortOrder: labelDefinition.sortOrder,
      parentId: labelDefinition.parentId,
    })
    .from(labelDefinition)
    .where(and(eq(labelDefinition.type, 'RECOMMENDED'), eq(labelDefinition.visibleInFilter, true)))
    .orderBy(labelDefinition.sortOrder, labelDefinition.id);

  const translations = await translationsOf(
    db,
    defs.map((d) => d.id),
  );
  const defRows = new Map(defs.map((d) => [d.id, d.slug]));

  return defs.map((d) => {
    // displayName 回退链：请求 locale 精确 → 主语言前缀（zh-CN → zh）→ en → slug
    // （06 §2.3 永不空显示；RFC 语言标签前缀匹配——Accept-Language 常带区域码）
    const t = translations.get(d.id) ?? [];
    const primary = locale.split('-')[0]!;
    const hit =
      t.find((x) => x.locale === locale) ??
      t.find((x) => x.locale === primary) ??
      t.find((x) => x.locale === 'en') ??
      t[0];
    return {
      slug: d.slug,
      type: d.type,
      parentId: d.parentId === null ? null : (defRows.get(d.parentId) ?? null),
      displayName: hit?.displayName ?? d.slug,
    };
  });
}

/** 管理列表（SUPER_ADMIN 全量——含 PRIVILEGED/隐藏项与翻译） */
export async function listManagedLabels(db: Db): Promise<ManagedLabel[]> {
  const defs = await db
    .select({
      id: labelDefinition.id,
      slug: labelDefinition.slug,
      type: labelDefinition.type,
      visibleInFilter: labelDefinition.visibleInFilter,
      sortOrder: labelDefinition.sortOrder,
      parentId: labelDefinition.parentId,
      createdBy: labelDefinition.createdBy,
    })
    .from(labelDefinition)
    .orderBy(labelDefinition.sortOrder, labelDefinition.id);
  const translations = await translationsOf(
    db,
    defs.map((d) => d.id),
  );
  const parentSlugById = new Map(defs.map((d) => [d.id, d.slug]));
  return defs.map((d) => ({
    ...d,
    parentId: d.parentId === null ? null : d.parentId, // DB 内部 id（管理面可直用——06 §5.2 API 层 slug；管理面简化回 slug？——统一回 slug 更一致）
    parentSlug: d.parentId === null ? null : (parentSlugById.get(d.parentId) ?? null),
    translations: translations.get(d.id) ?? [],
  }));
}

/** label slug 查 label 定义（T11 挂载复用——按 slug 拿内部 id + type） */
export async function findLabelBySlug(
  db: Db,
  slug: string,
): Promise<{ id: number; slug: string; type: LabelType; parentId: number | null }> {
  const row = await loadBySlug(db, slug);
  return { id: row.id, slug: row.slug, type: row.type, parentId: row.parentId };
}

/* ==================== 资产挂载（06 §3/§5.3——T11） ==================== */

/** 每资产挂载上限（06 §1） */
export const MAX_LABELS_PER_ASSET = 10;

/**
 * 挂载判定（06 §3——只看 label.type）：RECOMMENDED = owner/空间 ADMIN/SUPER_ADMIN
 * （canManageAsset——路由层判定结果）；PRIVILEGED = 仅 SUPER_ADMIN。
 */
export function canAttachLabel(
  type: LabelType,
  canManage: boolean,
  isSuperAdmin: boolean,
): boolean {
  if (type === 'PRIVILEGED') return isSuperAdmin;
  return canManage || isSuperAdmin;
}

/**
 * 挂载 label（幂等：已挂 → 200 成功不报错——06 §5.3 挂载面宽 + UNIQUE 兜底防前端竞态）。
 * 上限 ≤10（超限 400 label.limit_exceeded）；判定输入由路由层组装（canManageAsset/isSuperAdmin）。
 * 层级无关：一级/二级均可挂（06 §4——挂载不感知层级）。
 */
export async function attachLabel(
  db: Db,
  audit: AuditWriter,
  input: {
    assetId: number;
    labelSlug: string;
    actorId: string;
    canManage: boolean;
    isSuperAdmin: boolean;
  },
): Promise<void> {
  const { assetId, labelSlug, actorId } = input;
  const label = await findLabelBySlug(db, labelSlug); // 不存在 → label.not_found
  if (!canAttachLabel(label.type, input.canManage, input.isSuperAdmin)) {
    throw new LabelError(labelErrorCodes.accessDenied);
  }

  try {
    const inserted = await db.transaction(async (tx) => {
      // 上限（幂等豁免：已挂不计入上限）
      const [existing] = await tx
        .select({ id: assetLabel.id })
        .from(assetLabel)
        .where(and(eq(assetLabel.assetId, assetId), eq(assetLabel.labelId, label.id)));
      if (existing) return 'duplicate' as const;

      const [cnt] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(assetLabel)
        .where(eq(assetLabel.assetId, assetId));
      if (Number(cnt?.n ?? 0) >= MAX_LABELS_PER_ASSET)
        throw new LabelError(labelErrorCodes.limitExceeded);

      await tx.insert(assetLabel).values({ assetId, labelId: label.id, createdBy: actorId });
      return 'inserted' as const;
    });

    if (inserted === 'duplicate') return; // 幂等：已挂即成功（200）
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === '23505') return; // 并发重复挂——幂等吸收
    throw err;
  }

  await audit({
    actorId,
    action: 'asset.label_attach',
    targetType: 'asset',
    targetId: String(assetId),
    detail: { labelSlug },
  });
}

/** 移除挂载（幂等 204：不存在亦成功——DELETE 语义；判定同挂载——06 §3「移除挂载同挂载权限」） */
export async function detachLabel(
  db: Db,
  audit: AuditWriter,
  input: {
    assetId: number;
    labelSlug: string;
    actorId: string;
    canManage: boolean;
    isSuperAdmin: boolean;
  },
): Promise<void> {
  const label = await findLabelBySlug(db, input.labelSlug);
  if (!canAttachLabel(label.type, input.canManage, input.isSuperAdmin)) {
    throw new LabelError(labelErrorCodes.accessDenied);
  }
  await db
    .delete(assetLabel)
    .where(and(eq(assetLabel.assetId, input.assetId), eq(assetLabel.labelId, label.id)));
  await audit({
    actorId: input.actorId,
    action: 'asset.label_detach',
    targetType: 'asset',
    targetId: String(input.assetId),
    detail: { labelSlug: input.labelSlug },
  });
}

/** 资产挂载的 label slug 列表（详情响应——06 §5.3 查询响应；挂载顺序无关——按 label id 稳定序） */
export async function labelsOfAsset(db: Db, assetId: number): Promise<string[]> {
  const rows = await db
    .select({ slug: labelDefinition.slug, id: labelDefinition.id })
    .from(assetLabel)
    .innerJoin(labelDefinition, eq(assetLabel.labelId, labelDefinition.id))
    .where(eq(assetLabel.assetId, assetId))
    .orderBy(labelDefinition.id);
  return rows.map((r) => r.slug);
}
