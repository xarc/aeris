import { AluOperation } from './ALU';

export type LoadKind = 'LB' | 'LBU' | 'LH' | 'LHU' | 'LW';
export type StoreKind = 'SB' | 'SH' | 'SW';
export type BranchKind = 'BEQ' | 'BNE' | 'BLT' | 'BGE' | 'BLTU' | 'BGEU';

export type ControlSignals = {
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;

  loadKind?: LoadKind;
  storeKind?: StoreKind;

  branch?: BranchKind;
  jump: boolean;
  jalr: boolean;

  lui: boolean;
  auipc: boolean;

  aluOp: AluOperation;
  aluSrcImm: boolean;
  aluSrcPc: boolean;
};

export class ControlUnit {
  generate(opcode: number, funct3: number, funct7: number): ControlSignals {
    const signals: ControlSignals = {
      regWrite: false,
      memRead: false,
      memWrite: false,
      jump: false,
      jalr: false,
      lui: false,
      auipc: false,
      aluOp: 'ADD',
      aluSrcImm: false,
      aluSrcPc: false,
    };

    switch (opcode) {
      case 0x33: {
        signals.regWrite = true;
        signals.aluSrcImm = false;
        signals.aluSrcPc = false;

        if (funct3 === 0x0 && funct7 === 0x00) {
          signals.aluOp = 'ADD';
        } else if (funct3 === 0x0 && funct7 === 0x20) {
          signals.aluOp = 'SUB';
        } else if (funct3 === 0x7) {
          signals.aluOp = 'AND';
        } else if (funct3 === 0x6) {
          signals.aluOp = 'OR';
        } else if (funct3 === 0x4) {
          signals.aluOp = 'XOR';
        } else if (funct3 === 0x1) {
          signals.aluOp = 'SLL';
        } else if (funct3 === 0x5 && funct7 === 0x00) {
          signals.aluOp = 'SRL';
        } else if (funct3 === 0x5 && funct7 === 0x20) {
          signals.aluOp = 'SRA';
        } else if (funct3 === 0x2) {
          signals.aluOp = 'SLT';
        } else if (funct3 === 0x3) {
          signals.aluOp = 'SLTU';
        }
        return signals;
      }

      case 0x13: {
        signals.regWrite = true;
        signals.aluSrcImm = true;

        if (funct3 === 0x0) {
          signals.aluOp = 'ADD';
        } else if (funct3 === 0x7) {
          signals.aluOp = 'AND';
        } else if (funct3 === 0x6) {
          signals.aluOp = 'OR';
        } else if (funct3 === 0x4) {
          signals.aluOp = 'XOR';
        } else if (funct3 === 0x2) {
          signals.aluOp = 'SLT';
        } else if (funct3 === 0x3) {
          signals.aluOp = 'SLTU';
        } else if (funct3 === 0x1) {
          signals.aluOp = 'SLL';
        } else if (funct3 === 0x5 && funct7 === 0x00) {
          signals.aluOp = 'SRL';
        } else if (funct3 === 0x5 && funct7 === 0x20) {
          signals.aluOp = 'SRA';
        }
        return signals;
      }

      case 0x03: {
        signals.regWrite = true;
        signals.memRead = true;
        signals.aluSrcImm = true;
        signals.aluOp = 'ADD';

        if (funct3 === 0x0) {
          signals.loadKind = 'LB';
        } else if (funct3 === 0x1) {
          signals.loadKind = 'LH';
        } else if (funct3 === 0x2) {
          signals.loadKind = 'LW';
        } else if (funct3 === 0x4) {
          signals.loadKind = 'LBU';
        } else if (funct3 === 0x5) {
          signals.loadKind = 'LHU';
        }
        return signals;
      }

      case 0x23: {
        signals.memWrite = true;
        signals.aluSrcImm = true;
        signals.aluOp = 'ADD';

        if (funct3 === 0x0) {
          signals.storeKind = 'SB';
        } else if (funct3 === 0x1) {
          signals.storeKind = 'SH';
        } else if (funct3 === 0x2) {
          signals.storeKind = 'SW';
        }
        return signals;
      }

      case 0x63: {
        if (funct3 === 0x0) {
          signals.branch = 'BEQ';
        } else if (funct3 === 0x1) {
          signals.branch = 'BNE';
        } else if (funct3 === 0x4) {
          signals.branch = 'BLT';
        } else if (funct3 === 0x5) {
          signals.branch = 'BGE';
        } else if (funct3 === 0x6) {
          signals.branch = 'BLTU';
        } else if (funct3 === 0x7) {
          signals.branch = 'BGEU';
        }
        return signals;
      }

      case 0x37: {
        signals.regWrite = true;
        signals.lui = true;
        return signals;
      }

      case 0x17: {
        signals.regWrite = true;
        signals.auipc = true;
        signals.aluSrcPc = true;
        signals.aluSrcImm = true;
        signals.aluOp = 'ADD';
        return signals;
      }

      case 0x6f: {
        signals.regWrite = true;
        signals.jump = true;
        signals.jalr = false;
        signals.aluSrcPc = true;
        signals.aluSrcImm = true;
        signals.aluOp = 'ADD';
        return signals;
      }

      case 0x67: {
        signals.regWrite = true;
        signals.jump = true;
        signals.jalr = true;
        signals.aluSrcPc = false;
        signals.aluSrcImm = true;
        signals.aluOp = 'ADD';
        return signals;
      }

      // SYSTEM 1110011 (ecall/ebreak)
      case 0x73: {
        return signals;
      }
    }

    return signals;
  }
}
