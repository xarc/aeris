function signExtend(value: number, bits: number): number {
  const shift = 32 - bits;
  return (value << shift) >> shift;
}

export function immI(inst: number): number {
  return signExtend(inst >>> 20, 12) | 0;
}

export function immS(inst: number): number {
  const high = (inst >>> 25) & 0x7f;
  const lower = (inst >>> 7) & 0x1f;
  return signExtend((high << 5) | lower, 12) | 0;
}

export function immB(inst: number): number {
  const bit12 = (inst >>> 31) & 0x1;
  const bit11 = (inst >>> 7) & 0x1;
  const bits10_5 = (inst >>> 25) & 0x3f;
  const bits4_1 = (inst >>> 8) & 0xf;
  const immediate = (bit12 << 12) | (bit11 << 11) | (bits10_5 << 5) | (bits4_1 << 1);
  return signExtend(immediate, 13) | 0;
}

export function immU(instruction: number): number {
  return (instruction & 0xfffff000) | 0;
}

export function immJ(instruction: number): number {
  const bit20 = (instruction >>> 31) & 0x1;
  const bits19_12 = (instruction >>> 12) & 0xff;
  const bit11 = (instruction >>> 20) & 0x1;
  const bits10_1 = (instruction >>> 21) & 0x3ff;
  const imm = (bit20 << 20) | (bits19_12 << 12) | (bit11 << 11) | (bits10_1 << 1);
  return signExtend(imm, 21) | 0;
}
