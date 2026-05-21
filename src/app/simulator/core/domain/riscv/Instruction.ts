export type DecodedInstruction = {
  raw: number;
  opcode: number;
  rd: number;
  funct3: number;
  rs1: number;
  rs2: number;
  funct7: number;
};

export function decode(inst: number): DecodedInstruction {
  const unsigned = inst >>> 0;
  return {
    raw: unsigned,
    opcode: unsigned & 0x7f,
    rd: (unsigned >>> 7) & 0x1f,
    funct3: (unsigned >>> 12) & 0x7,
    rs1: (unsigned >>> 15) & 0x1f,
    rs2: (unsigned >>> 20) & 0x1f,
    funct7: (unsigned >>> 25) & 0x7f,
  };
}
