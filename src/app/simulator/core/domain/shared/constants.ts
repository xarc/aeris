export const ConstantsInit = {
  PC: 0x0040_0000, // 4194304
  INST_MEM_INIT: 0x0040_0000, // 4194304
  DATA_MEM_INIT: 0x1001_0000, // 268500992
} as const;

export const Bit32Limit = {
  lowerLimit: -2147483648,
  upperLimit: 2147483647,
} as const;

export const IMM_I_BITS = 12;
export const IMM_I_MIN = -(1 << (IMM_I_BITS - 1)); // -2048
export const IMM_I_MAX = (1 << (IMM_I_BITS - 1)) - 1; // 2047

export const IMM_U_BITS = 20;
export const IMM_U_MIN = -(1 << (IMM_U_BITS - 1)); // -524288
export const IMM_U_MAX = (1 << (IMM_U_BITS - 1)) - 1; // 524287

export const WORD_SHIFT = 4096; // 2^12 = 4096
export const ROUNDING_OFFSET = 2048; // 0x800

export const AUIPC_CONST = 64528;
