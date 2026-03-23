export type DumpFormat = 'binary' | 'hexadecimal' | 'text';

export interface DumpType {
  id?: string;
  label: DumpFormat;
  description: string;
  type: string;
}

export const DUMP_TYPES: readonly DumpType[] = [
  { id: '1', label: 'binary', description: 'Exports instructions encoded in binary machine code', type: 'bin' },
  { id: '2', label: 'hexadecimal', description: 'Exports instructions encoded in hexadecimal machine code', type: 'hex'},
  { id: '3', label: 'text', description: 'Exports instructions as readable assembly with addresses', type: 'txt' },
] as const;
