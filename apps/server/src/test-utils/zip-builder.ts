/**
 * zip store（无压缩）构造器——校验器测试专用（无外部 zip 写入依赖）。
 * 支持 unix mode（目录/symlink 用例）与任意条目路径（穿越用例）。
 */
export interface ZipFixtureEntry {
  name: string;
  content?: string | Buffer;
  /** unix mode（默认 0o100644 普通文件）；mode 高 16 位写入 central external attrs */
  mode?: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const idx = (crc ^ buf[i]!) & 0xff;
    crc = CRC_TABLE[idx]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(): { time: number; date: number } {
  // 固定 2024-01-01 00:00（可复现字节）
  return { time: 0, date: ((2024 - 1980) << 9) | (1 << 5) | 1 };
}

export function buildZip(entries: ZipFixtureEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const { time, date } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content ?? '');
    const mode = entry.mode ?? 0o100644;
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    chunks.push(local, name, content);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(0x031e, 4); // version made by: unix (3 << 8) | 30
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(content.length, 20);
    cd.writeUInt32LE(content.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30); // extra len
    cd.writeUInt16LE(0, 32); // comment len
    cd.writeUInt16LE(0, 34); // disk
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE((mode << 16) >>> 0, 38); // external attrs（unix mode 高 16 位，无符号化）
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += 30 + name.length + content.length;
  }

  const cdSize = central.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, ...central, eocd]);
}

/** 合法 skill 包（SKILL.md + references 样例）——各族用例复用 */
export function buildSkillZip(extra?: ZipFixtureEntry[]): Buffer {
  const skillMd =
    '---\nname: hello\nversion: 1.0.0\ndescription: hello world\n---\n# Hello\n\nA demo skill.\n';
  return buildZip([
    { name: 'SKILL.md', content: skillMd },
    { name: 'references/demo.md', content: 'reference\n' },
    ...(extra ?? []),
  ]);
}
