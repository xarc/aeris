import { SimulatorStateObject } from '../shared/types';
import { binaryToHexadecimal } from '../shared/utils';
import { encodeInstruction } from './encoder/Encoder';
import { Validator } from './Validator';

export class Assembler {
  assemble(state: SimulatorStateObject): SimulatorStateObject {
    const { analysis } = state;
    Validator.validate(analysis);

    for (const inst of analysis.text) {
      const binary = encodeInstruction(inst);
      inst.machine = {
        binary,
        hex: binaryToHexadecimal(binary),
        decimal: parseInt(binary, 2),
      };
    }

    return {
      ...state,
      assembled: true,
    };
  }
}
