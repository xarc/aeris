import { StateMutation } from '../shared/types';
import { toUint32 } from '../shared/utils';
import { decode } from './Instruction';
import { Memory } from './state/Memory';
import { ProgramCounter } from './state/ProgramCounter';
import { RegisterFile } from './state/RegisterFile';
import { ALU } from './units/ALU';
import { ControlUnit } from './units/Control';
import { immI, immS, immB, immU, immJ } from './units/ImmediateGenerator';

type Context = {
  pc: ProgramCounter;
  registers: RegisterFile;
  memory: Memory;
};

function branchTaken(
  kind: NonNullable<ReturnType<ControlUnit['generate']>['branch']>,
  a: number,
  b: number,
): boolean {
  a |= 0;
  b |= 0;
  const au = toUint32(a);
  const bu = toUint32(b);

  switch (kind) {
    case 'BEQ':
      return a === b;
    case 'BNE':
      return a !== b;
    case 'BLT':
      return a < b;
    case 'BGE':
      return a >= b;
    case 'BLTU':
      return au < bu;
    case 'BGEU':
      return au >= bu;
  }
}

export class CPU {
  private alu = new ALU();
  private control = new ControlUnit();

  constructor(private context: Context) {}

  step(): StateMutation {
    const pc = this.context.pc.get();
    const previousPc = pc;

    let writtenRegisterIndex: number | null = null;
    let writtenMemoryAddress: number | null = null;

    const instWord = this.context.memory.readWord(pc) >>> 0;
    const inst = decode(instWord);

    if (inst.opcode === 0x73) {
      const pcPlus4 = this.context.pc.plus4();
      this.context.pc.set(pcPlus4);

      return {
        previousPc: pc,
        nextPc: pcPlus4,
        isSyscall: true,
      };
    }

    const control = this.control.generate(inst.opcode, inst.funct3, inst.funct7);

    const rs1Value = this.context.registers.read(inst.rs1);
    const rs2Value = this.context.registers.read(inst.rs2);

    const iImm = immI(instWord);
    const sImm = immS(instWord);
    const bImm = immB(instWord);
    const uImm = immU(instWord);
    const jImm = immJ(instWord);

    const aluA = control.aluSrcPc ? pc : rs1Value;
    let aluB: number;

    if (control.aluSrcImm) {
      if (control.memWrite) aluB = sImm;
      else if (control.branch) aluB = rs2Value;
      else if (control.lui) aluB = uImm;
      else if (control.jump && !control.jalr) aluB = jImm;
      else if (control.auipc) aluB = uImm;
      else aluB = iImm;
    } else {
      aluB = rs2Value;
    }

    let aluResult = this.alu.exec(control.aluOp, aluA, aluB);

    if (control.jump && control.jalr) {
      aluResult = (aluResult & ~1) | 0;
    }

    let loadData = 0;

    if (control.memRead && control.loadKind) {
      const address = aluResult;

      switch (control.loadKind) {
        case 'LB':
          loadData = this.context.memory.readI8(address);
          break;
        case 'LBU':
          loadData = this.context.memory.readU8(address) | 0;
          break;
        case 'LH':
          loadData = this.context.memory.readI16(address);
          break;
        case 'LHU':
          loadData = this.context.memory.readU16(address) | 0;
          break;
        case 'LW':
          loadData = this.context.memory.readWord(address);
          break;
      }
    }

    if (control.memWrite && control.storeKind) {
      const address = aluResult;
      writtenMemoryAddress = address;

      switch (control.storeKind) {
        case 'SB':
          this.context.memory.writeU8(address, rs2Value);
          break;
        case 'SH':
          this.context.memory.writeU16(address, rs2Value);
          break;
        case 'SW':
          this.context.memory.writeWord(address, rs2Value);
          break;
      }
    }

    const pcPlus4 = this.context.pc.plus4();

    if (control.regWrite && inst.rd !== 0) {
      let writeBack: number;

      if (control.memRead) {
        writeBack = loadData;
      } else if (control.lui) {
        writeBack = uImm;
      } else if (control.jump) {
        writeBack = pcPlus4;
      } else {
        writeBack = aluResult;
      }

      //TODO: verificar se só altera na UI se for control.regWrite
      // writtenRegisterIndex = inst.rd;
      this.context.registers.write(inst.rd, writeBack);
    }

    if (control.regWrite && inst.rd !== 0) {
      writtenRegisterIndex = inst.rd;
    }

    this.context.registers.enforceX0();

    let nextPc = pcPlus4;

    if (control.branch) {
      if (branchTaken(control.branch, rs1Value, rs2Value)) {
        nextPc = (pc + bImm) | 0;
      }
    }

    if (control.jump) {
      nextPc = aluResult;
    }

    this.context.pc.set(nextPc);

    return {
      writtenRegisterIndex,
      writtenMemoryAddress,
      previousPc,
      nextPc,
    };
  }
}
