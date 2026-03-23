export function getBinaryRange(left: number, right: number, binary: string) {
  const reversed = binary.split('').reverse().join('');
  return reversed
    .substring(right, left + 1)
    .split('')
    .reverse()
    .join('');
}

export function decimalToBinary(decimal: number | string) {
  const isNegative = Number(decimal) < 0;
  return isNegative
    ? (Number(decimal) >>> 0).toString(2)
    : parseInt(decimal.toString()).toString(2);
}

export function binaryToHexadecimal(binary: string) {
  return parseInt(binary, 2).toString(16).toUpperCase();
}

export function hexadecimalToBinary(hex: string) {
  return parseInt(hex, 16).toString(2).padStart(8, '0');
}

export function binaryToDecimalSigned(binary: string) {
  const negative = binary[0] === '1';
  if (negative) {
    let inverse = '';
    for (let i = 1; i < binary.length; i++) {
      inverse += binary[i] === '0' ? '1' : '0';
    }
    return (parseInt(inverse, 2) + 1) * -1;
  }
  return parseInt(binary, 2);
}

export function convertArrayBinaryToHexadecimal(code: string[]): string {
  return code.map((binary) => resizeHex(binaryToHexadecimal(binary), 10)).join('\n');
}

export function resizeHex(instructions: string, quantity: number, fillChar = '0') {
  return instructions.padStart(quantity - 2, fillChar).padStart(quantity, 'x');
}

export function resize(instruction: string, quantity: number, fillChar = '0') {
  return instruction.padStart(quantity, fillChar);
}

export function resizeSigned(instruction: string, quantity: number) {
  const fillChar = instruction[0] === '1' ? '1' : '0';
  return instruction.padStart(quantity, fillChar);
}

export function toUnsigned32(num: number) {
  return num >>> 0;
}

export function getOpcode(instruction: string) {
  return getBinaryRange(6, 0, instruction);
}

export function getFunct3(instruction: string) {
  return getBinaryRange(14, 12, instruction);
}

export function getFunct7(instruction: string) {
  return getBinaryRange(31, 25, instruction);
}

export function toInt32(n: number): number {
  return n | 0;
}
export function toUint32(n: number): number {
  return n >>> 0;
}
