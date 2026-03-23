import { toInt32 } from "../../shared/utils";

function getWordAddr(address: number): number {
  return address & ~3;
}

export class Memory {
  private mem: Map<number, number>;

  private constructor(mem: Map<number, number>) {
    this.mem = mem;
  }

  static fromRecord(rec: Record<number, number>): Memory {
    const memory = new Map<number, number>();
    for (const [k, v] of Object.entries(rec)) {
      const address = Number(k);
      if (Number.isFinite(address)) {
        memory.set(address | 0, toInt32(v));
      }
    }
    return new Memory(memory);
  }

  toRecord(): Record<number, number> {
    const record: Record<number, number> = {};
    for (const [k, v] of this.mem.entries()) {
      record[k] = v | 0;
    }
    return record;
  }

  readWord(address: number): number {
    const base = getWordAddr(address | 0);
    return (this.mem.get(base) ?? 0) | 0;
  }

  writeWord(address: number, value: number): void {
    const base = getWordAddr(address | 0);
    this.mem.set(base, toInt32(value));
  }

  readU8(address: number): number {
    const base = getWordAddr(address | 0);
    const off = (address | 0) & 3;
    const word = this.readWord(base) >>> 0;
    return (word >>> (8 * off)) & 0xff;
  }

  readI8(address: number): number {
    const u8 = this.readU8(address);
    return (u8 << 24) >> 24;
  }

  readU16(address: number): number {
    const b0 = this.readU8(address);
    const b1 = this.readU8((address | 0) + 1);
    return (b0 | (b1 << 8)) & 0xffff;
  }

  readI16(address: number): number {
    const u16 = this.readU16(address);
    return (u16 << 16) >> 16;
  }

  writeU8(address: number, value: number): void {
    const base = getWordAddr(address | 0);
    const off = (address | 0) & 3;
    const word = this.readWord(base) >>> 0;

    const mask = ~(0xff << (8 * off)) >>> 0;
    const next = ((word & mask) | ((value & 0xff) << (8 * off))) >>> 0;
    this.writeWord(base, next | 0);
  }

  writeU16(address: number, value: number): void {
    this.writeU8(address, value & 0xff);
    this.writeU8((address | 0) + 1, (value >>> 8) & 0xff);
  }
}
