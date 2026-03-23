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
  const u = inst >>> 0;
  return {
    raw: u,
    opcode: u & 0x7f,
    rd: (u >>> 7) & 0x1f,
    funct3: (u >>> 12) & 0x7,
    rs1: (u >>> 15) & 0x1f,
    rs2: (u >>> 20) & 0x1f,
    funct7: (u >>> 25) & 0x7f,
  };
}
