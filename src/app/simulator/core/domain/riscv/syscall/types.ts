export type SyscallEffect =
  | { kind: 'print'; text: string }
  | { kind: 'read'; type: 'int' }
  | { kind: 'read'; type: 'string'; address: number; maxLength: number }
  | { kind: 'none' };

export type SyscallDomainResult = {
  effect: SyscallEffect;
};

export type SyscallAdapterResult = {
  newRegisters?: Record<string, number>;
  input?: string;
};