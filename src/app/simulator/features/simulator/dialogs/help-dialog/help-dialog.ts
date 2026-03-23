import { Component, HostListener } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SyscallCode } from '../../../../core/domain/riscv/syscall/SyscallCodes';

type TabKey = 'basic' | 'pseudo' | 'directives' | 'operands' | 'syscalls';

@Component({
  selector: 'app-help-dialog',
  standalone: false,
  templateUrl: './help-dialog.html',
  styleUrl: './help-dialog.scss',
})
export class HelpDialog {
  activeTab: TabKey = 'basic';
  search = '';

  tabs: Array<{
    key: TabKey;
    label: string;
    icon: string;
    description: string;
  }> = [
    { key: 'basic', label: 'Basic', icon: 'memory', description: 'RV32I base instructions' },
    { key: 'pseudo', label: 'Pseudo', icon: 'code', description: 'Assembler pseudo-instructions' },
    {
      key: 'directives',
      label: 'Directives',
      icon: 'description',
      description: 'Assembler directives',
    },
    { key: 'operands', label: 'Operands', icon: 'tag', description: 'Operand syntax' },
    {
      key: 'syscalls',
      label: 'Syscalls',
      icon: 'terminal',
      description: 'System calls',
    },
  ];

  constructor(public dialogRef: MatDialogRef<HelpDialog>) {}

  //TODO: Verify in assembler the constants
  operands = [
    { name: 'label, target', desc: 'any textual label' },
    { name: 't1, t2, t3', desc: 'any integer register' },
    { name: '10', desc: 'unsigned 5-bit integer (0 to 31)' },
    { name: '-100', desc: 'signed 16-bit integer (-32768 to 32767)' },
    { name: '100', desc: 'unsigned 16-bit integer (0 to 65535)' },
    {
      name: '100000',
      desc: 'signed 32-bit integer (-2147483648 to 2147483647)',
    },
    { name: '(t2)', desc: 'contents of register t2' },
    { name: '-100(t2)', desc: 'signed offset added to register t2' },
    { name: '100(t2)', desc: 'unsigned offset added to register t2' },
    { name: '100000(t2)', desc: '32-bit offset added to register t2' },
    { name: 'label', desc: '32-bit address of label' },
  ];

  basicInstructions = [
    { name: 'add t1, t2, t3', desc: 'Addition: set t1 = t2 + t3' },
    {
      name: 'addi t1, t2, imm',
      desc: 'Addition Immediate: set t1 = t2 + sign-extended 12-bit immediate',
    },
    { name: 'sub t1, t2, t3', desc: 'Subtraction: set t1 = t2 - t3' },

    { name: 'and t1, t2, t3', desc: 'Bitwise AND: set t1 = t2 & t3' },
    {
      name: 'andi t1, t2, imm',
      desc: 'Bitwise AND Immediate: set t1 = t2 & sign-extended 12-bit immediate',
    },
    { name: 'or t1, t2, t3', desc: 'Bitwise OR: set t1 = t2 | t3' },
    {
      name: 'ori t1, t2, imm',
      desc: 'Bitwise OR Immediate: set t1 = t2 | sign-extended 12-bit immediate',
    },
    { name: 'xor t1, t2, t3', desc: 'Bitwise XOR: set t1 = t2 ^ t3' },
    {
      name: 'xori t1, t2, imm',
      desc: 'Bitwise XOR Immediate: set t1 = t2 ^ sign-extended 12-bit immediate',
    },

    {
      name: 'sll t1, t2, t3',
      desc: 'Shift Left Logical: shift t2 left by amount in low 5 bits of t3',
    },
    {
      name: 'slli t1, t2, shamt',
      desc: 'Shift Left Logical Immediate: shift t2 left by immediate shift amount',
    },
    {
      name: 'srl t1, t2, t3',
      desc: 'Shift Right Logical: shift t2 right by amount in low 5 bits of t3',
    },
    {
      name: 'srli t1, t2, shamt',
      desc: 'Shift Right Logical Immediate: shift t2 right by immediate shift amount',
    },
    {
      name: 'sra t1, t2, t3',
      desc: 'Shift Right Arithmetic: arithmetic shift right preserving sign bit',
    },
    {
      name: 'srai t1, t2, shamt',
      desc: 'Shift Right Arithmetic Immediate: arithmetic shift right by immediate amount',
    },

    {
      name: 'slt t1, t2, t3',
      desc: 'Set Less Than: set t1 = 1 if t2 < t3 (signed), else 0',
    },
    {
      name: 'slti t1, t2, imm',
      desc: 'Set Less Than Immediate: set t1 = 1 if t2 < sign-extended immediate (signed)',
    },
    {
      name: 'sltu t1, t2, t3',
      desc: 'Set Less Than Unsigned: set t1 = 1 if t2 < t3 (unsigned)',
    },
    {
      name: 'sltiu t1, t2, imm',
      desc: 'Set Less Than Immediate Unsigned: set t1 = 1 if t2 < immediate (unsigned)',
    },

    {
      name: 'lw t1, offset(t2)',
      desc: 'Load Word: load 32-bit value from memory address t2 + offset',
    },
    {
      name: 'lh t1, offset(t2)',
      desc: 'Load Halfword: load 16-bit value from memory and sign-extend',
    },
    {
      name: 'lhu t1, offset(t2)',
      desc: 'Load Halfword Unsigned: load 16-bit value from memory and zero-extend',
    },
    {
      name: 'lb t1, offset(t2)',
      desc: 'Load Byte: load 8-bit value from memory and sign-extend',
    },
    {
      name: 'lbu t1, offset(t2)',
      desc: 'Load Byte Unsigned: load 8-bit value from memory and zero-extend',
    },

    {
      name: 'sw t1, offset(t2)',
      desc: 'Store Word: store 32-bit value from t1 into memory address t2 + offset',
    },
    {
      name: 'sh t1, offset(t2)',
      desc: 'Store Halfword: store low 16 bits of t1 into memory',
    },
    {
      name: 'sb t1, offset(t2)',
      desc: 'Store Byte: store low 8 bits of t1 into memory',
    },

    {
      name: 'beq t1, t2, label',
      desc: 'Branch if Equal: jump to label if t1 == t2',
    },
    {
      name: 'bne t1, t2, label',
      desc: 'Branch if Not Equal: jump to label if t1 != t2',
    },
    {
      name: 'blt t1, t2, label',
      desc: 'Branch if Less Than: jump if t1 < t2 (signed)',
    },
    {
      name: 'bge t1, t2, label',
      desc: 'Branch if Greater or Equal: jump if t1 >= t2 (signed)',
    },
    {
      name: 'bltu t1, t2, label',
      desc: 'Branch if Less Than Unsigned: jump if t1 < t2 (unsigned)',
    },
    {
      name: 'bgeu t1, t2, label',
      desc: 'Branch if Greater or Equal Unsigned: jump if t1 >= t2 (unsigned)',
    },

    {
      name: 'jal t1, label',
      desc: 'Jump and Link: store return address in t1 and jump to label',
    },
    {
      name: 'jalr t1, t2, imm',
      desc: 'Jump and Link Register: store return address in t1 and jump to t2 + immediate',
    },

    {
      name: 'lui t1, imm',
      desc: 'Load Upper Immediate: place 20-bit immediate in upper bits of t1',
    },
    {
      name: 'auipc t1, imm',
      desc: 'Add Upper Immediate to PC: set t1 = PC + upper immediate',
    },
  ];

  pseudoInstructions: any[] = [
    { name: 'beqz t1, label', desc: 'Branch if Equal Zero: branch to label if t1 == 0' },
    { name: 'bgez t1, label', desc: 'Branch if Greater or Equal Zero: branch to label if t1 >= 0' },
    { name: 'bgt t1, t2, label', desc: 'Branch if Greater Than: branch to label if t1 > t2' },
    {
      name: 'bgtu t1, t2, label',
      desc: 'Branch if Greater Than Unsigned: branch if t1 > t2 (unsigned comparison)',
    },
    { name: 'bgtz t1, label', desc: 'Branch if Greater Than Zero: branch if t1 > 0' },
    { name: 'ble t1, t2, label', desc: 'Branch if Less or Equal: branch if t1 <= t2' },
    {
      name: 'bleu t1, t2, label',
      desc: 'Branch if Less or Equal Unsigned: branch if t1 <= t2 (unsigned comparison)',
    },
    { name: 'blez t1, label', desc: 'Branch if Less or Equal Zero: branch if t1 <= 0' },
    { name: 'bltz t1, label', desc: 'Branch if Less Than Zero: branch if t1 < 0' },
    { name: 'bnez t1, label', desc: 'Branch if Not Equal Zero: branch if t1 != 0' },

    { name: 'j label', desc: 'Jump: unconditional jump to label' },
    { name: 'jal label', desc: 'Jump and Link: jump to label and store return address in ra' },

    {
      name: 'jalr t0',
      desc: 'Jump and Link Register: jump to address in t0 and store return address in ra',
    },
    {
      name: 'jalr t0, -100',
      desc: 'Jump and Link Register: jump to address t0 + immediate and store return address in ra',
    },
    {
      name: 'jalr t0, -100(t1)',
      desc: 'Jump and Link Register: jump to address t1 + immediate and store return address in t0',
    },

    { name: 'jr t0', desc: 'Jump Register: jump to address stored in t0' },
    { name: 'jr t0, -100', desc: 'Jump Register: jump to address t0 + immediate' },

    { name: 'la t1, label', desc: 'Load Address: load the address of label into register t1' },

    {
      name: 'lb t1, (t2)',
      desc: 'Load Byte: load byte from memory address in t2 into t1 (sign-extended)',
    },
    {
      name: 'lb t1, -100',
      desc: 'Load Byte Immediate: load byte from address using immediate offset',
    },
    {
      name: 'lb t1, 10000000',
      desc: 'Load Byte Immediate: load byte from address using large immediate value',
    },
    {
      name: 'lb t1, label',
      desc: 'Load Byte: load byte from address at label into t1 (sign-extended)',
    },

    {
      name: 'lbu t1, (t2)',
      desc: 'Load Byte Unsigned: load byte from memory and zero-extend into t1',
    },
    {
      name: 'lbu t1, -100',
      desc: 'Load Byte Unsigned Immediate: load byte using immediate offset and zero-extend',
    },
    {
      name: 'lbu t1, 10000000',
      desc: 'Load Byte Unsigned Immediate: load byte using large immediate offset and zero-extend',
    },
    {
      name: 'lbu t1, label',
      desc: 'Load Byte Unsigned: load byte from address at label into t1 (zero-extended)',
    },

    {
      name: 'lh t1, (t2)',
      desc: 'Load Halfword: load 16-bit value from memory into t1 (sign-extended)',
    },
    { name: 'lh t1, -100', desc: 'Load Halfword Immediate: load halfword using immediate offset' },
    {
      name: 'lh t1, 10000000',
      desc: 'Load Halfword Immediate: load halfword using large immediate offset',
    },
    {
      name: 'lh t1, label',
      desc: 'Load Halfword: load 16-bit value from address at label into t1 (sign-extended)',
    },

    {
      name: 'lhu t1, (t2)',
      desc: 'Load Halfword Unsigned: load 16-bit value and zero-extend into t1',
    },
    {
      name: 'lhu t1, -100',
      desc: 'Load Halfword Unsigned Immediate: load halfword using immediate offset and zero-extend',
    },
    {
      name: 'lhu t1, 10000000',
      desc: 'Load Halfword Unsigned Immediate: load halfword using large immediate offset and zero-extend',
    },
    {
      name: 'lhu t1, label',
      desc: 'Load Halfword Unsigned: load 16-bit value from address at label into t1 (zero-extended)',
    },

    {
      name: 'li t1, -100',
      desc: 'Load Immediate: load sign-extended immediate value into register t1',
    },
    {
      name: 'li t1, 10000000',
      desc: 'Load Immediate: load large immediate value into register t1',
    },

    { name: 'lw t1, (t2)', desc: 'Load Word: load 32-bit value from memory address in t2 into t1' },
    { name: 'lw t1, -100', desc: 'Load Word Immediate: load word using immediate offset' },
    {
      name: 'lw t1, 10000000',
      desc: 'Load Word Immediate: load word using large immediate offset',
    },
    {
      name: 'lw t1, label',
      desc: 'Load Word: load 32-bit value from address at label into t1',
    },

    { name: 'mv t1, t2', desc: 'Move: copy value from register t2 into register t1' },

    { name: 'nop', desc: 'No Operation: instruction that performs no action' },

    { name: 'not t1, t2', desc: 'Bitwise NOT: invert all bits of t2 and store result in t1' },

    {
      name: 'sb t1, (t2)',
      desc: 'Store Byte: store the lowest 8 bits of t1 into memory at address in t2',
    },
    { name: 'sb t1, -100', desc: 'Store Byte Immediate: store byte using immediate offset' },
    {
      name: 'sb t1, label, t2',
      desc: 'Store Byte: store lowest 8 bits of t1 to memory at label using t2 as temporary',
    },

    { name: 'seqz t1, t2', desc: 'Set Equal Zero: set t1 = 1 if t2 == 0 else 0' },

    { name: 'sgt t1, t2, t3', desc: 'Set Greater Than: set t1 = 1 if t2 > t3 else 0' },
    {
      name: 'sgtu t1, t2, t3',
      desc: 'Set Greater Than Unsigned: set t1 = 1 if t2 > t3 (unsigned comparison)',
    },
    { name: 'sgtz t1, t2', desc: 'Set Greater Than Zero: set t1 = 1 if t2 > 0 else 0' },

    {
      name: 'sh t1, (t2)',
      desc: 'Store Halfword: store lowest 16 bits of t1 into memory at address in t2',
    },
    {
      name: 'sh t1, -100',
      desc: 'Store Halfword Immediate: store halfword using immediate offset',
    },
    {
      name: 'sh t1, label, t2',
      desc: 'Store Halfword: store lowest 16 bits of t1 to memory at label using t2 as temporary',
    },

    { name: 'sltz t1, t2', desc: 'Set Less Than Zero: set t1 = 1 if t2 < 0 else 0' },
    { name: 'snez t1, t2', desc: 'Set Not Equal Zero: set t1 = 1 if t2 != 0 else 0' },

    {
      name: 'sw t1, (t2)',
      desc: 'Store Word: store 32-bit value from t1 into memory address in t2',
    },
    { name: 'sw t1, -100', desc: 'Store Word Immediate: store word using immediate offset' },
    {
      name: 'sw t1, label, t2',
      desc: 'Store Word: store 32-bit value of t1 to memory at label using t2 as temporary',
    },
  ];

  directives = [
    { name: '.ascii', desc: 'Store string in the Data Segment (no null terminator)' },
    { name: '.string', desc: 'Alias for .ascii' },
    { name: '.word', desc: 'Store the listed value(s) as 32 bit words on word boundary' },
  ];

  syscalls = [
    {
      name: `Number ${SyscallCode.PrintInt}`,
      desc: 'PrintInt: prints integer stored in a0',
    },
    {
      name: `Number ${SyscallCode.PrintString}`,
      desc: 'PrintString: prints string from address in a0',
    },
    {
      name: `Number ${SyscallCode.ReadInt}`,
      desc: 'ReadInt: reads integer from console into a0',
    },
    {
      name: `Number ${SyscallCode.ReadString}`,
      desc: 'ReadString: reads string into memory (a0 buffer, a1 size)',
    },
  ];

  get currentTab() {
    return this.tabs.find((t) => t.key === this.activeTab)!;
  }

  get filteredData() {
    const search = this.search.trim().toLowerCase();
    const data = this.getDataMap()[this.activeTab] ?? [];

    if (!search) {
      return data;
    }

    return data.filter(
      (i) => i.name.toLowerCase().includes(search) || i.desc.toLowerCase().includes(search),
    );
  }

  getCategoryLabel(cat: string): string {
    return (
      {
        arithmetic: 'Arithmetic',
        logic: 'Logic',
        branch: 'Branch',
        memory: 'Memory',
        shift: 'Shift',
        jump: 'Jump',
        move: 'Move',
        directive: 'Directive',
        operand: 'Operand',
      }[cat] ?? ''
    );
  }

  getDataForTab(key: TabKey) {
    return this.getDataMap()[key] ?? [];
  }
  
  selectTab(tab: TabKey) {
    this.activeTab = tab;
    this.search = '';
  }

  clearSearch() {
    this.search = '';
  }

  closeDialog() {
    this.dialogRef.close();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeDialog();
  }

  private getDataMap(): Record<TabKey, any[]> {
    return {
      basic: this.basicInstructions,
      pseudo: this.pseudoInstructions,
      directives: this.directives,
      syscalls: this.syscalls,
      operands: this.operands,
    };
  }
}
