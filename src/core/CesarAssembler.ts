import { AssemblerError, AssemblerErrorCode } from "./AssemblerError";
import { Instruction, InstructionCode } from "./Instruction";
import { AddressingModeCode } from "./AddressingMode";
import { assertUnreachable, notNull, removeItem } from "./utils/FunctionUtils";
import { codeStringToNumber } from "./utils/Conversions";
import { Assembler } from "./Assembler";

export class CesarAssembler extends Assembler {

  protected calculateNumBytes(instruction: Instruction, args: string): number {
    const argumentList = this.splitInstructionArguments(args);

    // Fixed number of bytes
    if (instruction.getNumBytes() !== 0) {
      return instruction.getNumBytes();

    // Variable number of bytes and 1 argument
    } else if (instruction.hasParameter("a")) {
      const { additionalWord } = this.extractArgumentParts(this.extractArgument(argumentList, instruction, "a"), { skipValues: true });
      return 2 + (additionalWord !== null ? 2 : 0);

    // Variable number of bytes and 2 arguments
    } else if (instruction.hasParameter("a0") && instruction.hasParameter("a1")) {
      const { additionalWord: additionalWord0 } = this.extractArgumentParts(this.extractArgument(argumentList, instruction, "a0"), { skipValues: true });
      const { additionalWord: additionalWord1 } = this.extractArgumentParts(this.extractArgument(argumentList, instruction, "a1"), { skipValues: true });
      return 2 + (additionalWord0 !== null ? 2 : 0) + (additionalWord1 !== null ? 2 : 0);
    }

    assertUnreachable("Invalid argument pattern for instruction with variable number of bytes: " + instruction.getAssemblyFormat());
  }

  protected buildInstruction(instruction: Instruction, args: string): void {
    const argumentList = this.splitInstructionArguments(args);

    // Handle flags (early-return)
    if (instruction.hasParameter("f")) {
      return this.buildFlagInstruction(instruction, argumentList);
    }

    // Check if number of arguments is correct
    if (argumentList.length < instruction.getNumberOfParameters()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    } else if (argumentList.length > instruction.getNumberOfParameters()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS);
    }

    // Uses 2-byte word to simplify calculations (2nd byte will not be written for 1-byte instructions)
    let instructionWord = (instruction.getByteValue() << 8);
    const additionalWords: number[] = [];

    // Add plain register parameter bits [.... .rrr .... ....]
    if (instruction.hasParameter("r")) {
      instructionWord += this.registerNameToBitCode(argumentList[instruction.getParameterPos("r")]) << 8;
    }

    // Add offset instruction byte [.... .... oooo oooo]
    if (instruction.hasParameter("o")) {
      instructionWord += this.offsetArgumentToValue(argumentList[instruction.getParameterPos("o")], instruction) & 0xFF;
    }

    // Add 1st mode + register slot bits [.... mmmr rr.. ....]
    if (instruction.hasParameter("a0")) {
      const parameterPos = instruction.getParameterPos("a0");
      const wordAddress = this.machine.toValidAddress(this.pcValue + (additionalWords.length * 2) + 2);
      const { addressingModeCode, registerName, additionalWord } = this.extractArgumentParts(argumentList[parameterPos], { wordAddress });
      instructionWord += this.machine.getAddressingModeBitCode(addressingModeCode) << 9;
      instructionWord += this.registerNameToBitCode(registerName) << 6;

      if (additionalWord !== null) {
        additionalWords.push(additionalWord);
      }
    }

    // Add 2nd mode + register slot bits [.... .... ..mm mrrr]
    if (instruction.hasParameter("a1") || instruction.hasParameter("a")) {
      const parameterPos = (instruction.hasParameter("a1") ? instruction.getParameterPos("a1") : instruction.getParameterPos("a"));
      const wordAddress = this.machine.toValidAddress(this.pcValue + (additionalWords.length * 2) + 2);
      const { addressingModeCode, registerName, additionalWord } = this.extractArgumentParts(argumentList[parameterPos], { wordAddress });
      instructionWord += this.machine.getAddressingModeBitCode(addressingModeCode) << 3;
      instructionWord += this.registerNameToBitCode(registerName);

      if (additionalWord !== null) {
        additionalWords.push(additionalWord);
      }
    }

    // Write instruction byte(s)
    if (instruction.getNumBytes() === 1) {
      this.setAssemblerMemoryNext((instructionWord >> 8) & 0xFF);
    } else {
      this.setAssemblerMemoryNextWord(instructionWord);
    }

    // Write additional words
    for (const additionalWord of additionalWords) {
      this.setAssemblerMemoryNextWord(additionalWord);
    }
  }

  protected splitInstructionArguments(args: string): string[] {
    const trimmedArguments = args.trim();
    return (trimmedArguments === "") ? [] : trimmedArguments.split(Assembler.ARGUMENTS_SEPARATOR);
  }

  private buildFlagInstruction(instruction: Instruction, argumentList: string[]): void {
    // Split a single argument with concatenated flags into multiple arguments:
    const argumentListSplit = (argumentList.length === 1) ? argumentList[0].split("") : argumentList;

    let n, z, v, c;
    let remainingArguments = argumentListSplit;

    [n, remainingArguments] = this.extractFlag(remainingArguments, "N");
    [z, remainingArguments] = this.extractFlag(remainingArguments, "Z");
    [v, remainingArguments] = this.extractFlag(remainingArguments, "V");
    [c, remainingArguments] = this.extractFlag(remainingArguments, "C");

    if (remainingArguments.length > 0) {
      throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
    }

    // Instruction + flag bits [iiii nzvc]
    this.setAssemblerMemoryNext(instruction.getByteValue() + (n << 3) + (z << 2) + (v << 1) + c);
  }

  protected extractFlag(argumentList: string[], flagName: string): [ flagBit: 1 | 0, listWithoutFlag: string[] ] {
    const flagIndex = argumentList.includes(flagName) ? argumentList.indexOf(flagName) : argumentList.indexOf(flagName.toLowerCase());
    if (flagIndex > -1) {
      return [1, removeItem(argumentList, flagIndex)];
    } else {
      return [0, argumentList];
    }
  }

  private offsetArgumentToValue(argument: string, instruction: Instruction): number {
    const isSOB = (instruction.getInstructionCode() === InstructionCode.SOB);
    const nextPCValue = this.pcValue + 2; // TODO: What about off-limits?

    // Extract offset from argument
    const [labelOffset, argumentWithoutOffset] = this.extractOffsetFromArgument(argument, true);
    argument = argumentWithoutOffset;

    // Convert label to offset argument
    if (this.labelPCMap.has(argument.toLowerCase())) {
      const targetAddress = this.machine.toValidAddress(this.labelPCMap.get(argument.toLowerCase())! + labelOffset); // TODO: Probably breaks on wrap-around
      argument = String((isSOB ? -1 : 1) * (targetAddress - nextPCValue));
    }

    // Remove optional immediate symbol
    if (argument.startsWith("#")) {
      argument = argument.slice(1);
    }

    if (this.isValidValue(argument, -128, 127)) {
      return codeStringToNumber(argument);
    } else if (this.isValidValueFormat(argument)) {
      throw new AssemblerError(AssemblerErrorCode.INVALID_VALUE); // TODO: Invalid offset? Out of range?
    } else if (this.isValidLabelFormat(argument) && argument.length > 1) { // Assume label unless single character
      throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL);
    } else {
      throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
    }
  }

  protected extractArgumentParts(argument: string, { skipValues, wordAddress }: { skipValues?: boolean, wordAddress?: number }): {
    addressingModeCode: AddressingModeCode, registerName: string, additionalWord: number | null
  } {
    for (const addressingMode of this.machine.getAddressingModes()) {
      const matchingGroups = addressingMode.extractMatchingGroups(argument);

      if (matchingGroups) {
        const { register, offset } = matchingGroups;
        return {
          addressingModeCode: addressingMode.getAddressingModeCode(),
          registerName: register,
          additionalWord: offset ? (skipValues ? 0 : this.parseAdditionalWord({ register, offset, wordAddress: notNull(wordAddress) })) : null
        };
      }
    }

    // Pseudo-modes
    if (argument.startsWith("#")) { // Immediate: #a => (R7)+ a
      return {
        addressingModeCode: AddressingModeCode.REGISTER_POST_INC,
        registerName: "R7",
        additionalWord: skipValues ? 0 : this.argumentToValue(argument.slice(1), { isImmediate: true })
      };
    } else { // Direct: a => ((R7)+) a
      return {
        addressingModeCode: AddressingModeCode.INDIRECT_REGISTER_POST_INC,
        registerName: "R7",
        additionalWord: skipValues ? 0 : this.argumentToValue(argument, { isImmediate: false })
      };
    }
  }

  protected parseAdditionalWord({ register, offset, wordAddress }: { register: string, offset: string, wordAddress: number }): number {
    let argument = offset;

    if (register.toUpperCase() === "R7") { // Indexed R7 uses relative label offsets
      argument = this.labelToRelativeValue(offset, { wordAddress });
    }

    return this.argumentToValue(argument, { isImmediate: false, allowLabelOffset: false });
  }

  protected labelToRelativeValue(argument: string, { wordAddress }: { wordAddress: number }): string {
    if (this.labelPCMap.has(argument.toLowerCase())) {
      const targetAddress = this.labelPCMap.get(argument.toLowerCase())!;
      const nextPCValue = this.machine.toValidAddress(wordAddress + 2);
      return String(targetAddress - nextPCValue); // Convert label to relative address
    } else {
      return argument; // Not a label, return unchanged
    }
  }

}
