/* eslint-disable no-multi-spaces */

import { Machine } from "../Machine";
import { Register } from "../Register";
import { Flag, FlagCode } from "../Flag";
import { Instruction, InstructionCode } from "../Instruction";
import { AddressingMode, AddressingModeCode } from "../AddressingMode";
import { RegExpMatcher } from "../utils/RegExpMatcher";
import { assertUnreachable, isOneOf, notNull } from "../utils/FunctionUtils";
import { unsignedByteToSigned, unsignedWordToSigned } from "../utils/Conversions";

const {
  REGISTER, REGISTER_POST_INC, REGISTER_PRE_DEC, REGISTER_INDEXED,
  INDIRECT_REGISTER, INDIRECT_REGISTER_POST_INC, INDIRECT_REGISTER_PRE_DEC, INDIRECT_REGISTER_INDEXED
} = AddressingModeCode;

function patternToMatcher(pattern: string): RegExpMatcher {
  const patternWithGroups = pattern.replace(/([-()+])/g, "\\$1").replace("r", "(?<register>[Rr][0-7])").replace("o", "(?<offset>-?\\w+)");
  return new RegExpMatcher(patternWithGroups, "i");
}

function bits(value: number, lsbIndex: number, numBits: number): number {
  return (value >> lsbIndex) & ((1 << numBits) - 1);
}

function word(value: number): number {
  return value & 0xFFFF;
}

type ByteArgument = { value: number }
type RegisterArgument = { registerName: string }
type RegisterModeArgument = { registerName: string, mode: AddressingModeCode }

type InstructionArguments = {
  f?: ByteArgument,
  o?: ByteArgument,
  r?: RegisterArgument,
  a?: RegisterModeArgument,
  a0?: RegisterModeArgument,
  a1?: RegisterModeArgument,
}

type ResultWithFlags = {
  result: number,
  carry: boolean | null,
  overflow: boolean
}

export class Cesar extends Machine {

  public static SINGLE_BYTE_ACCESS_AREA = 65498;

  public static KEYBOARD_STATUS_ADDRESS = 65498;
  public static KEYBOARD_BUFFER_ADDRESS = 65499;
  public static DISPLAY_ADDRESS = 65500;

  public static KEYBOARD_STATUS_KEY_PRESSED = 0x80;

  constructor() {
    super({
      name: "Cesar",
      identifier: "C16",
      fileExtension: "ced",
      memorySize: 65536,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO,     "Z", true),
        new Flag(FlagCode.OVERFLOW, "V"),
        new Flag(FlagCode.CARRY,    "C")
      ],
      registers: [
        new Register("R0", ".....000", 16),
        new Register("R1", ".....001", 16),
        new Register("R2", ".....010", 16),
        new Register("R3", ".....011", 16),
        new Register("R4", ".....100", 16),
        new Register("R5", ".....101", 16),
        new Register("R6", ".....110", 16, false), // SP
        new Register("R7", ".....111", 16, false)  // PC
      ],
      instructions: [
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),

        // Condition codes
        new Instruction(1, "0001....", InstructionCode.CCC, "ccc f"), // 0001nzvc
        new Instruction(1, "0010....", InstructionCode.SCC, "scc f"), // 0010nzvc

        // Conditional branching
        new Instruction(2, "00110000", InstructionCode.BR,  "br o"),  // 00110000 oooooooo
        new Instruction(2, "00110001", InstructionCode.BNE, "bne o"), // [...]
        new Instruction(2, "00110010", InstructionCode.BEQ, "beq o"),
        new Instruction(2, "00110011", InstructionCode.BPL, "bpl o"),
        new Instruction(2, "00110100", InstructionCode.BMI, "bmi o"),
        new Instruction(2, "00110101", InstructionCode.BVC, "bvc o"),
        new Instruction(2, "00110110", InstructionCode.BVS, "bvs o"),
        new Instruction(2, "00110111", InstructionCode.BCC, "bcc o"),
        new Instruction(2, "00111000", InstructionCode.BCS, "bcs o"),
        new Instruction(2, "00111001", InstructionCode.BGE, "bge o"),
        new Instruction(2, "00111010", InstructionCode.BLT, "blt o"),
        new Instruction(2, "00111011", InstructionCode.BGT, "bgt o"),
        new Instruction(2, "00111100", InstructionCode.BLE, "ble o"),
        new Instruction(2, "00111101", InstructionCode.BHI, "bhi o"),
        new Instruction(2, "00111110", InstructionCode.BLS, "bls o"),

        // Flow control
        new Instruction(0, "0100....", InstructionCode.JMP, "jmp a"),   // 0100.... ..mmmrrr
        new Instruction(2, "0101....", InstructionCode.SOB, "sob r o"), // 0101.rrr oooooooo
        new Instruction(0, "0110....", InstructionCode.JSR, "jsr r a"), // 0110.rrr ..mmmrrr
        new Instruction(1, "0111....", InstructionCode.RTS, "rts r"),   // 0111.rrr

        // Arithmetic (one operand)
        new Instruction(0, "10000000", InstructionCode.CLR, "clr a"), // 10000000 ..mmmrrr
        new Instruction(0, "10000001", InstructionCode.NOT, "not a"), // [...]
        new Instruction(0, "10000010", InstructionCode.INC, "inc a"),
        new Instruction(0, "10000011", InstructionCode.DEC, "dec a"),
        new Instruction(0, "10000100", InstructionCode.NEG, "neg a"),
        new Instruction(0, "10000101", InstructionCode.TST, "tst a"),
        new Instruction(0, "10000110", InstructionCode.ROR, "ror a"),
        new Instruction(0, "10000111", InstructionCode.ROL, "rol a"),
        new Instruction(0, "10001000", InstructionCode.ASR, "asr a"),
        new Instruction(0, "10001001", InstructionCode.ASL, "asl a"),
        new Instruction(0, "10001010", InstructionCode.ADC, "adc a"),
        new Instruction(0, "10001011", InstructionCode.SBC, "sbc a"),

        // Arithmetic (two operands)
        new Instruction(0, "1001....", InstructionCode.MOV, "mov a0 a1"), // 1001mmmr rrmmmrrr
        new Instruction(0, "1010....", InstructionCode.ADD, "add a0 a1"), // [...]
        new Instruction(0, "1011....", InstructionCode.SUB, "sub a0 a1"),
        new Instruction(0, "1100....", InstructionCode.CMP, "cmp a0 a1"),
        new Instruction(0, "1101....", InstructionCode.AND, "and a0 a1"),
        new Instruction(0, "1110....", InstructionCode.OR,  "or a0 a1"),

        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode(".....000", AddressingModeCode.REGISTER,                   "r",      patternToMatcher), // TODO: AddressingMode.NO_PATTERN
        new AddressingMode(".....001", AddressingModeCode.REGISTER_POST_INC,          "(r)+",   patternToMatcher), // Immediate: #a => (R7)+ a
        new AddressingMode(".....010", AddressingModeCode.REGISTER_PRE_DEC,           "-(r)",   patternToMatcher),
        new AddressingMode(".....011", AddressingModeCode.REGISTER_INDEXED,           "o(r)",   patternToMatcher),
        new AddressingMode(".....100", AddressingModeCode.INDIRECT_REGISTER,          "(r)",    patternToMatcher),
        new AddressingMode(".....101", AddressingModeCode.INDIRECT_REGISTER_POST_INC, "((r)+)", patternToMatcher), // Direct: a => ((R7)+) a
        new AddressingMode(".....110", AddressingModeCode.INDIRECT_REGISTER_PRE_DEC,  "(-(r))", patternToMatcher),
        new AddressingMode(".....111", AddressingModeCode.INDIRECT_REGISTER_INDEXED,  "(o(r))", patternToMatcher)
      ],
      immediateNumBytes: 2,
      pcName: "R7"
    });

  }

  public static isCesar(machine: Machine | null): machine is Cesar {
    return machine?.getName() === "Cesar"; // instanceof would fail on hot-reloads
  }

  //////////////////////////////////////////////////
  // Step
  //////////////////////////////////////////////////

  public step(): void {
    const { fetchedValue, instruction } = this.fetchInstruction();
    const instructionArguments = this.decodeCesarInstruction(fetchedValue, instruction);
    this.executeCesarInstruction(instruction, instructionArguments);
  }

  public fetchInstruction(): { fetchedValue: number, instruction: Instruction | null } {
    let fetchedValue = this.memoryReadNext(); // Read first byte
    const instruction = this.getInstructionFromValue(fetchedValue);
    if (instruction?.getNumBytes() === 2 || instruction?.getNumBytes() === 0) {
      fetchedValue = (fetchedValue << 8) + this.memoryReadNext(); // Fetch full word
    }
    return { fetchedValue, instruction };
  }

  private decodeCesarInstruction(
    fetchedValue: number, instruction: Instruction | null
  ): InstructionArguments {
    const instructionArguments: InstructionArguments = {};

    if (!instruction) {
      return {};
    }

    if (instruction.hasParameter("f")) {
      instructionArguments["f"] = { value: bits(fetchedValue, 0, 4) };
    }

    if (instruction.hasParameter("o")) {
      instructionArguments["o"] = { value: bits(fetchedValue, 0, 8) };
    }

    if (instruction.hasParameter("r")) {
      const lsbIndex = (instruction.getNumBytes() === 1) ? 0 : 8;
      instructionArguments["r"] = {
        registerName: this.extractRegisterName(bits(fetchedValue, lsbIndex, 3))
      };
    }

    if (instruction.hasParameter("a0")) {
      instructionArguments["a0"] = {
        registerName: this.extractRegisterName(bits(fetchedValue, 6, 3)),
        mode: this.extractAddressingModeCode(bits(fetchedValue, 9, 3))
      };
    }

    if (instruction.hasParameter("a1") || instruction.hasParameter("a")) {
      const parameterName = instruction.hasParameter("a1") ? "a1" : "a";
      instructionArguments[parameterName] = {
        registerName: this.extractRegisterName(bits(fetchedValue, 0, 3)),
        mode: this.extractAddressingModeCode(bits(fetchedValue, 3, 3))
      };
    }

    return instructionArguments;
  }

  private executeCesarInstruction(instruction: Instruction | null, instructionArguments: InstructionArguments): void {
    const instructionCode = instruction?.getInstructionCode() || InstructionCode.NOP;

    // Condition codes
    if (instructionArguments.f) {
      this.executeConditionCodeInstruction(instructionCode, instructionArguments.f.value);

    // Conditional branching
    } else if (instructionArguments.o && instructionCode !== InstructionCode.SOB) {
      this.executeBranchInstruction(instructionCode, instructionArguments.o.value);

    // Flow control
    } else if (instructionCode === InstructionCode.JMP) {
      this.executeJMPInstruction(notNull(instructionArguments.a));

    } else if (instructionCode === InstructionCode.SOB) {
      this.executeSOBInstruction(notNull(instructionArguments.r).registerName, notNull(instructionArguments.o).value); // TODO: Update flags? Other instr.?

    } else if (instructionCode === InstructionCode.JSR) {
      this.executeJSRInstruction(notNull(instructionArguments.r).registerName, notNull(instructionArguments.a));

    } else if (instructionCode === InstructionCode.RTS) {
      this.executeRTSInstruction(notNull(instructionArguments.r).registerName);

    // Arithmetic (one operand)
    } else if (instructionArguments.a) {
      this.executeOneOperandArithmeticInstruction(instructionCode, instructionArguments.a);

    // Arithmetic (two operands)
    } else if (instructionArguments.a0 && instructionArguments.a1) {
      this.executeTwoOperandsArithmeticInstruction(instructionCode, instructionArguments.a0, instructionArguments.a1);

    // Halt
    } else if (instructionCode === InstructionCode.HLT) {
      this.setRunning(false);
    }

    this.incrementInstructionCount();
  }

  //////////////////////////////////////////////////
  // Condition codes
  //////////////////////////////////////////////////

  private executeConditionCodeInstruction(instructionCode: InstructionCode, flagBits: number): void {
    (flagBits & 0b1000) && this.setFlagValue("N", (instructionCode === InstructionCode.SCC));
    (flagBits & 0b0100) && this.setFlagValue("Z", (instructionCode === InstructionCode.SCC));
    (flagBits & 0b0010) && this.setFlagValue("V", (instructionCode === InstructionCode.SCC));
    (flagBits & 0b0001) && this.setFlagValue("C", (instructionCode === InstructionCode.SCC));
  }

  //////////////////////////////////////////////////
  // Conditional branching
  //////////////////////////////////////////////////

  private executeBranchInstruction(instructionCode: InstructionCode, offset: number): void {
    if (this.shouldBranch(instructionCode)) {
      this.setPCValue(this.getPCValue() + unsignedByteToSigned(offset));
    }
  }

  private shouldBranch(instructionCode: InstructionCode): boolean {
    const [n, z, v, c] = this.getFlags().map(f => f.getValue());

    switch (instructionCode) {
      case InstructionCode.BR:  return true;

      case InstructionCode.BNE: return !z;
      case InstructionCode.BEQ: return z;
      case InstructionCode.BPL: return !n;
      case InstructionCode.BMI: return n;
      case InstructionCode.BVC: return !v;
      case InstructionCode.BVS: return v;
      case InstructionCode.BCC: return !c;
      case InstructionCode.BCS: return c;

      case InstructionCode.BGE: return n === v;
      case InstructionCode.BLT: return n !== v;
      case InstructionCode.BGT: return (n === v) && !z;
      case InstructionCode.BLE: return (n !== v) || z;

      case InstructionCode.BHI: return !c && !z;
      case InstructionCode.BLS: return c || z;

      default: assertUnreachable(`Invalid branch instruction code: ${instructionCode}`);
    }
  }

  //////////////////////////////////////////////////
  // Flow control
  //////////////////////////////////////////////////

  private executeJMPInstruction(argument: RegisterModeArgument): void {
    const [ _, jumpAddress ] = this.readOperand(argument, { addressOnly: true });

    // Jump = NOP when mode = REGISTER
    if (jumpAddress !== undefined) {
      this.setPCValue(jumpAddress);
    }
  }

  private executeSOBInstruction(registerName: string, offset: number): void {
    const registerValue = this.subtractValueFromRegister(registerName, 1);
    if (registerValue !== 0) {
      this.incrementPCValue(-unsignedByteToSigned(offset));
    }
  }

  private executeJSRInstruction(registerName: string, argument: RegisterModeArgument): void {
    const [ _, subroutineAddress ] = this.readOperand(argument, { addressOnly: true });

    // Jump = NOP when mode = REGISTER
    if (subroutineAddress !== undefined) {
      this.stackPush(this.getRegisterValue(registerName));
      this.setRegisterValue(registerName, this.getPCValue());
      this.setPCValue(subroutineAddress);
    }
  }

  private executeRTSInstruction(registerName: string): void {
    this.setPCValue(this.getRegisterValue(registerName));
    this.setRegisterValue(registerName, this.stackPop());
  }

  //////////////////////////////////////////////////
  // Arithmetic
  //////////////////////////////////////////////////

  private executeOneOperandArithmeticInstruction(instructionCode: InstructionCode, argument: RegisterModeArgument): void {
    // Read operand
    const [ operand, writeAddress ] = this.readOperand(argument, { addressOnly: (instructionCode === InstructionCode.CLR) });

    // Compute result
    const { result, carry, overflow } = this.computeOneOperandResult(instructionCode, operand ?? 0);

    // Write result and flags
    (instructionCode !== InstructionCode.TST) && this.writeResult(writeAddress, result, argument);
    this.updateFlagsForResult({ result, carry, overflow });
  }

  private executeTwoOperandsArithmeticInstruction(instructionCode: InstructionCode, source: RegisterModeArgument, destination: RegisterModeArgument): void {
    // Read operands
    const [ sourceValue ] = this.readOperand(source);
    const [ destinationValue, destinationAddress ] = this.readOperand(destination, { addressOnly: (instructionCode === InstructionCode.MOV) });

    // Compute result
    const { result, carry, overflow } = this.computeTwoOperandsResult(instructionCode, notNull(sourceValue), destinationValue ?? 0);

    // Write result and flags
    this.updateFlagsForResult({ result, carry, overflow });
    (instructionCode !== InstructionCode.CMP) && this.writeResult(destinationAddress, result, destination);
  }

  private updateFlagsForResult({ result, carry, overflow }: ResultWithFlags): void {
    this.setFlagValue("N", result >= 0x8000);
    this.setFlagValue("Z", result === 0);
    (carry !== null) && this.setCarry(carry);
    this.setOverflow(overflow);
  }

  private computeOneOperandResult(instructionCode: InstructionCode, operand: number): ResultWithFlags {
    const c = this.getFlagBit("C");

    switch (instructionCode) {
      case InstructionCode.CLR: return { result: 0,              carry: false, overflow: false };
      case InstructionCode.NOT: return { result: word(~operand), carry: true,  overflow: false };
      case InstructionCode.TST: return { result: operand,        carry: false, overflow: false };

      case InstructionCode.INC: return this.computeAdd(operand, 1);
      case InstructionCode.DEC: return this.computeSub(operand, 1);
      case InstructionCode.NEG: return this.computeSub(0, operand);
      case InstructionCode.ADC: return this.computeAdd(operand, c);
      case InstructionCode.SBC: return this.computeSub(operand, c, { carryMeansBorrow: false });

      case InstructionCode.ROR: return this.computeShiftOverflow({ result:     (operand >> 1) | (c << 15),          carry: Boolean(operand & 1)      });
      case InstructionCode.ROL: return this.computeShiftOverflow({ result: word(operand << 1) | c,                  carry: Boolean(operand & 0x8000) });
      case InstructionCode.ASR: return this.computeShiftOverflow({ result:     (operand >> 1) | (operand & 0x8000), carry: Boolean(operand & 1)      });
      case InstructionCode.ASL: return this.computeShiftOverflow({ result: word(operand << 1),                      carry: Boolean(operand & 0x8000) });

      default: assertUnreachable(`Invalid instruction code for one operand arithmetic: ${InstructionCode[instructionCode]}`);
    }
  }

  private computeTwoOperandsResult(instructionCode: InstructionCode, sourceValue: number, destinationValue: number): ResultWithFlags {
    switch (instructionCode) {
      case InstructionCode.MOV: return { result: sourceValue, carry: null, overflow: false };

      case InstructionCode.ADD: return this.computeAdd(destinationValue, sourceValue);
      case InstructionCode.SUB: return this.computeSub(destinationValue, sourceValue);
      case InstructionCode.CMP: return this.computeSub(sourceValue, destinationValue);

      case InstructionCode.AND: return { result: word(sourceValue & destinationValue), carry: null, overflow: false };
      case InstructionCode.OR:  return { result: word(sourceValue | destinationValue), carry: null, overflow: false };

      default: assertUnreachable(`Invalid instruction code for two operands arithmetic: ${InstructionCode[instructionCode]}`);
    }
  }

  private computeAdd(value0: number, value1: number): ResultWithFlags {
    const result = word(value0 + value1);
    return {
      result,
      carry: (value0 + value1) > 0xFFFF,
      overflow: unsignedWordToSigned(value0) + unsignedWordToSigned(value1) !== unsignedWordToSigned(result)
    };
  }

  private computeSub(value0: number, value1: number, { carryMeansBorrow = true } = {}): ResultWithFlags {
    const result = word(value0 - value1);
    const borrow = (value0 - value1) < 0;
    return {
      result,
      carry: carryMeansBorrow ? borrow : !borrow,
      overflow: unsignedWordToSigned(value0) - unsignedWordToSigned(value1) !== unsignedWordToSigned(result)
    };
  }

  private computeShiftOverflow({ result, carry }: { result: number, carry: boolean }): ResultWithFlags {
    const negative = (result >= 0x8000);
    return { result, carry, overflow: negative !== carry }; // V = (N xor C)
  }

  //////////////////////////////////////////////////
  // Read / Write
  //////////////////////////////////////////////////

  private handlePreDecrement({ registerName, mode }: RegisterModeArgument): void {
    if (isOneOf(mode, [REGISTER_PRE_DEC, INDIRECT_REGISTER_PRE_DEC])) {
      this.subtractValueFromRegister(registerName, 2);
    }
  }

  private handlePostIncrement({ registerName, mode }: RegisterModeArgument): void {
    if (isOneOf(mode, [REGISTER_POST_INC, INDIRECT_REGISTER_POST_INC])) {
      this.addValueToRegister(registerName, 2);
    }
  }

  private readOperand({ registerName, mode }: RegisterModeArgument, { addressOnly } = { addressOnly: false }): [ operand?: number, operandAddress?: number ] {
    let operand, operandAddress: number | undefined;

    this.handlePreDecrement({ registerName, mode });

    // Compute offset
    let offset = 0;
    if (isOneOf(mode, [REGISTER_INDEXED, INDIRECT_REGISTER_INDEXED])) {
      offset = this.memoryReadNextWord();
    }

    // Read operand
    if (mode === REGISTER) {
      operand = addressOnly ? undefined : this.getRegisterValue(registerName);
    } else if (isOneOf(mode, [REGISTER_POST_INC, REGISTER_PRE_DEC, REGISTER_INDEXED, INDIRECT_REGISTER])) {
      operandAddress = word(this.getRegisterValue(registerName) + offset);
      operand = addressOnly ? undefined : this.memoryReadWordOrByte(operandAddress);
    } else if (isOneOf(mode, [INDIRECT_REGISTER_POST_INC, INDIRECT_REGISTER_PRE_DEC, INDIRECT_REGISTER_INDEXED])) {
      const intermediaryAddress = word(this.getRegisterValue(registerName) + offset);
      operandAddress = this.memoryReadTwoByteAddress(intermediaryAddress);
      operand = addressOnly ? undefined : this.memoryReadWordOrByte(operandAddress);
    } else {
      assertUnreachable(`Unrecognized mode: ${mode}`);
    }

    this.handlePostIncrement({ registerName, mode });

    return [ operand, operandAddress ];
  }

  private writeResult(writeAddress: number | undefined, result: number, { registerName, mode }: RegisterModeArgument): void {
    if (mode === REGISTER) {
      this.setRegisterValue(registerName, result);
    } else {
      this.memoryWriteWordOrByte(notNull(writeAddress), result);
    }
  }

  //////////////////////////////////////////////////
  // High-level accessors
  //////////////////////////////////////////////////

  public handleKeyboardInput(asciiValue: number): void {
    const statusBit = this.getMemoryValue(Cesar.KEYBOARD_STATUS_ADDRESS) & 0x80;
    if (statusBit === 0) {
      this.setMemoryValue(Cesar.KEYBOARD_STATUS_ADDRESS, this.getMemoryValue(Cesar.KEYBOARD_STATUS_ADDRESS) | 0x80);
      this.setMemoryValue(Cesar.KEYBOARD_BUFFER_ADDRESS, asciiValue);
    }
  }

  // Increments accessCount
  private memoryReadNextWord(): number {
    const mostSignificantByte = this.memoryReadNext();
    const leastSignificantByte = this.memoryReadNext();
    return (mostSignificantByte << 8) | leastSignificantByte;
  }

  // Increments accessCount
  private memoryReadWordOrByte(address: number): number {
    if (address >= Cesar.SINGLE_BYTE_ACCESS_AREA) {
      return this.memoryRead(address);
    } else {
      return this.memoryReadWord(address);
    }
  }

  // Increments accessCount
  private memoryWriteWordOrByte(address: number, value: number): void {
    if (address >= Cesar.SINGLE_BYTE_ACCESS_AREA) {
      this.memoryWrite(address, value);
    } else {
      this.memoryWriteWord(address, value);
    }
  }

  private getMemoryWordOrByte(address: number): number {
    if (address >= Cesar.SINGLE_BYTE_ACCESS_AREA) {
      return this.getMemoryValue(address);
    } else {
      return (this.getMemoryValue(address) << 8) | this.getMemoryValue(address + 1);
    }
  }

  private stackPush(value: number): void {
    this.subtractValueFromRegister("R6", 2);
    this.memoryWriteWord(this.getRegisterValue("R6"), value);
  }

  private stackPop(): number {
    const value = this.memoryReadWord(this.getRegisterValue("R6"));
    this.addValueToRegister("R6", 2);
    return value;
  }

  //////////////////////////////////////////////////
  // Disassembler (instruction strings)
  //////////////////////////////////////////////////

  // TODO: Rename argumentsSize to extraBytes
  public generateInstructionString(address: number): { memoryString: string, argumentsSize: number } {
    const argumentsList: string[] = [];
    let numBytes = 1;

    // Fetch instruction
    let fetchedValue = this.getMemoryValue(address);
    const instruction = this.getInstructionFromValue(fetchedValue);
    if (instruction?.getNumBytes() === 2 || instruction?.getNumBytes() === 0) {
      fetchedValue = (fetchedValue << 8) + this.getMemoryValue(address + 1); // Fetch full word
      numBytes += 1;
    }

    if (instruction === null || instruction.getInstructionCode() === InstructionCode.NOP) {
      return { memoryString: "", argumentsSize: numBytes - 1 };
    }

    // Decode instruction
    const instructionArguments = this.decodeCesarInstruction(fetchedValue, instruction);

    // Add flag argument
    if (instructionArguments.f) {
      argumentsList.push(this.generateFlagArgumentString(instructionArguments.f.value));
    }

    // Add register argument
    if (instructionArguments.r) {
      argumentsList.push(instructionArguments.r.registerName.toUpperCase());
    }

    // Add offset argument
    if (instructionArguments.o) {
      argumentsList.push(unsignedByteToSigned(instructionArguments.o.value).toString());
    }

    // Add register-mode arguments
    const registerModeArguments = [instructionArguments.a, instructionArguments.a0, instructionArguments.a1].filter(a => a) as RegisterModeArgument[];
    for (const registerModeArgument of registerModeArguments) {
      const { argumentString, extraBytes } = this.generateRegisterModeArgumentString(registerModeArgument, address + numBytes);
      argumentsList.push(argumentString);
      numBytes += extraBytes;
    }

    return {
      memoryString: `${instruction.getMnemonic().toUpperCase()} ${argumentsList.join(", ")}`.trim(),
      argumentsSize: numBytes - 1
    };
  }

  private generateRegisterModeArgumentString({ mode, registerName }: RegisterModeArgument, nextArgumentAddress: number): {
    argumentString: string, extraBytes: number
  } {
    // Immediate pseudo-mode
    if (registerName === "R7" && mode === REGISTER_POST_INC) {
      return { argumentString: "#" + this.getMemoryWordOrByte(nextArgumentAddress).toString(), extraBytes: 2 };
    }

    // Direct pseudo-mode
    if (registerName === "R7" && mode === INDIRECT_REGISTER_POST_INC) {
      return { argumentString: this.getMemoryWord(nextArgumentAddress).toString(), extraBytes: 2 };
    }

    // Offset mode
    if (isOneOf(mode, [REGISTER_INDEXED, INDIRECT_REGISTER_INDEXED])) {
      return {
        argumentString: this.getAddressingModePattern(mode)
          .replace("o", this.getMemoryWord(nextArgumentAddress).toString())
          .replace("r", registerName.toUpperCase()),
        extraBytes: 2
      };
    }

    // Non-offset mode
    return { argumentString: this.getAddressingModePattern(mode).replace("r", registerName.toUpperCase()), extraBytes: 0 };
  }

  private generateFlagArgumentString(flagBits: number): string {
    return (
      (flagBits & 0b1000 ? "N" : "") +
      (flagBits & 0b0100 ? "Z" : "") +
      (flagBits & 0b0010 ? "V" : "") +
      (flagBits & 0b0001 ? "C" : "")
    );
  }

}
