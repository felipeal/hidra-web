import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";
import { Byte } from "../core/Byte";
import { buildArray, range, validateSize } from "../core/Utils";
import { unsignedByteToSigned as toSigned } from "../core/Conversions";

export class Volta extends Machine {

  private stack: Byte[] = [];
  private stackMask!: number; // Stack address mask, populated by setStackSize

  constructor() {
    super({
      name: "Volta",
      identifier: "VLT", // Note: Not confirmed
      memorySize: 256,
      flags: [
      ],
      registers: [
        new Register("PC", "", 8, false),
        new Register("SP", "", 6, false)
      ],
      instructions: [
        new Instruction(1, "00000000", InstructionCode.NOP, "nop"),
        new Instruction(1, "00010001", InstructionCode.VOLTA_ADD, "add"),
        new Instruction(1, "00010010", InstructionCode.VOLTA_SUB, "sub"),
        new Instruction(1, "00010011", InstructionCode.VOLTA_AND, "and"),
        new Instruction(1, "00010100", InstructionCode.VOLTA_OR, "or"),
        new Instruction(1, "00100001", InstructionCode.VOLTA_CLR, "clr"),
        new Instruction(1, "00100010", InstructionCode.VOLTA_NOT, "not"),
        new Instruction(1, "00100011", InstructionCode.VOLTA_NEG, "neg"),
        new Instruction(1, "00100100", InstructionCode.VOLTA_INC, "inc"),
        new Instruction(1, "00100101", InstructionCode.VOLTA_DEC, "dec"),
        new Instruction(1, "00110001", InstructionCode.VOLTA_ASR, "asr"),
        new Instruction(1, "00110010", InstructionCode.VOLTA_ASL, "asl"),
        new Instruction(1, "00110011", InstructionCode.VOLTA_ROR, "ror"),
        new Instruction(1, "00110100", InstructionCode.VOLTA_ROL, "rol"),
        new Instruction(1, "01000001", InstructionCode.VOLTA_SZ, "sz"),
        new Instruction(1, "01000010", InstructionCode.VOLTA_SNZ, "snz"),
        new Instruction(1, "01000011", InstructionCode.VOLTA_SPL, "spl"),
        new Instruction(1, "01000100", InstructionCode.VOLTA_SMI, "smi"),
        new Instruction(1, "01000101", InstructionCode.VOLTA_SPZ, "spz"),
        new Instruction(1, "01000110", InstructionCode.VOLTA_SMZ, "smz"),
        new Instruction(1, "01010001", InstructionCode.VOLTA_SEQ, "seq"),
        new Instruction(1, "01010010", InstructionCode.VOLTA_SNE, "sne"),
        new Instruction(1, "01010011", InstructionCode.VOLTA_SGR, "sgr"),
        new Instruction(1, "01010100", InstructionCode.VOLTA_SLS, "sls"),
        new Instruction(1, "01010101", InstructionCode.VOLTA_SGE, "sge"),
        new Instruction(1, "01010110", InstructionCode.VOLTA_SLE, "sle"),
        new Instruction(1, "01100001", InstructionCode.VOLTA_RTS, "rts"),
        new Instruction(2, "011100..", InstructionCode.VOLTA_PSH, "psh a"),
        new Instruction(2, "100000..", InstructionCode.VOLTA_POP, "pop a"), // Reference book uses 011100mm for both PSH and POP (invalid)
        new Instruction(2, "100100..", InstructionCode.VOLTA_JMP, "jmp a"),
        new Instruction(2, "101000..", InstructionCode.VOLTA_JSR, "jsr a"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("......00", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN),
        new AddressingMode("......01", AddressingModeCode.INDIRECT, "(.*),i"),
        new AddressingMode("......10", AddressingModeCode.IMMEDIATE, "#(.*)"),
        new AddressingMode("......11", AddressingModeCode.INDEXED_BY_PC, "(.*),pc")
      ]
    });

    this.setStackSize(64);
  }

  public executeInstruction(instruction: Instruction, addressingModeCode: AddressingModeCode, _registerName: string, immediateAddress: number): void {
    let value1: number, value2: number, result: number, bit: number;
    const instructionCode = (instruction) ? instruction.getInstructionCode() : InstructionCode.NOP;
    const isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE); // Used to invalidate immediate jumps

    switch (instructionCode) {

      //////////////////////////////////////////////////
      // Arithmethic and logic (two operands)
      //////////////////////////////////////////////////

      case InstructionCode.VOLTA_ADD:
        value1 = this.stackPop();
        value2 = this.stackPop();
        result = value2 + value1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_SUB:
        value1 = this.stackPop();
        value2 = this.stackPop();
        result = value2 - value1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_AND:
        value1 = this.stackPop();
        value2 = this.stackPop();
        result = value2 & value1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_OR:
        value1 = this.stackPop();
        value2 = this.stackPop();
        result = value2 | value1;
        this.stackPush(result);
        break;

      //////////////////////////////////////////////////
      // Arithmethic and logic (one operand)
      //////////////////////////////////////////////////

      case InstructionCode.VOLTA_CLR:
        this.writeStackValue(this.getSPValue(), 0); // Replace top of stack, counts single access
        break;

      case InstructionCode.VOLTA_NOT:
        value1 = this.stackPop();
        result = ~value1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_NEG:
        value1 = toSigned(this.stackPop());
        result = -value1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_INC:
        value1 = this.stackPop();
        result = value1 + 1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_DEC:
        value1 = this.stackPop();
        result = value1 - 1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_ASR:
        value1 = this.stackPop();
        result = value1 >> 1;
        result |= (value1 & 0x80); // Preserve sign (arithmetic shift)
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_ASL:
        value1 = this.stackPop();
        result = value1 << 1;
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_ROR:
        value1 = this.stackPop();
        bit = value1 & 0x01; // Extract least significant bit
        result = (value1 >> 1) | (bit << 7);
        this.stackPush(result);
        break;

      case InstructionCode.VOLTA_ROL:
        value1 = this.stackPop();
        bit = value1 & 0x80; // Extract most significant bit
        result = (value1 << 1) | (bit >> 7);
        this.stackPush(result);
        break;

      //////////////////////////////////////////////////
      // Conditionals (one operand)
      //////////////////////////////////////////////////

      case InstructionCode.VOLTA_SZ:
        value1 = this.stackPop();
        if (value1 === 0) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SNZ:
        value1 = this.stackPop();
        if (value1 !== 0) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SPL:
        value1 = toSigned(this.stackPop());
        if (value1 > 0) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SMI:
        value1 = toSigned(this.stackPop());
        if (value1 < 0) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SPZ:
        value1 = toSigned(this.stackPop());
        if (value1 >= 0) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SMZ:
        value1 = toSigned(this.stackPop());
        if (value1 <= 0) {
          this.skipNextInstruction();
        }
        break;

      //////////////////////////////////////////////////
      // Conditionals (two operands)
      //////////////////////////////////////////////////

      case InstructionCode.VOLTA_SEQ:
        value1 = this.stackPop();
        value2 = this.stackPop();
        if (value2 === value1) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SNE:
        value1 = this.stackPop();
        value2 = this.stackPop();
        if (value2 !== value1) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SGR:
        value1 = toSigned(this.stackPop());
        value2 = toSigned(this.stackPop());
        if (value2 > value1) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SLS:
        value1 = toSigned(this.stackPop());
        value2 = toSigned(this.stackPop());
        if (value2 < value1) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SGE:
        value1 = toSigned(this.stackPop());
        value2 = toSigned(this.stackPop());
        if (value2 >= value1) {
          this.skipNextInstruction();
        }
        break;

      case InstructionCode.VOLTA_SLE:
        value1 = toSigned(this.stackPop());
        value2 = toSigned(this.stackPop());
        if (value2 <= value1) {
          this.skipNextInstruction();
        }
        break;

      //////////////////////////////////////////////////
      // Others
      //////////////////////////////////////////////////

      case InstructionCode.VOLTA_RTS:
        value1 = this.stackPop();
        this.setPCValue(value1);
        break;

      case InstructionCode.VOLTA_PSH:
        value1 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        this.stackPush(value1);
        break;

      case InstructionCode.VOLTA_POP:
        value1 = this.stackPop();
        this.memoryWrite(this.memoryGetOperandAddress(immediateAddress, addressingModeCode), value1);
        break;

      case InstructionCode.VOLTA_JMP:
        if (!isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.VOLTA_JSR:
        if (!isImmediate) {
          this.stackPush(this.getPCValue());
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.HLT:
        this.setRunning(false);
        break;

      default: // NOP etc.
        break;

    }

    this.incrementInstructionCount();
  }

  public skipNextInstruction(): void {
    // Read first byte
    const fetchedValue = this.memoryReadNext();
    const instruction = this.getInstructionFromValue(fetchedValue);

    // Skip next byte
    if (instruction && instruction.getNumBytes() === 2) {
      this.incrementPCValue();
    }
  }

  //////////////////////////////////////////////////
  // Stack push/pop with access count
  //////////////////////////////////////////////////

  public getStackSize(): number {
    return this.stack.length;
  }

  public stackPush(value: number): void {
    this.setSPValue(this.getSPValue() + 1);
    this.writeStackValue(this.getSPValue(), value);
  }

  public stackPop(): number {
    const value = this.readStackValue(this.getSPValue());
    this.setSPValue(this.getSPValue() - 1); // Decrement SP
    return value;
  }

  public readStackValue(address: number): number {
    this.incrementAccessCount();
    return this.getStackValue(address);
  }

  public writeStackValue(address: number, value: number): void {
    this.incrementAccessCount();
    this.setStackValue(address, value);
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  public setStackSize(size: number): void {
    validateSize(size);
    this.stack = buildArray(size, () => new Byte());
    this.stackMask = (size - 1);
  }

  public getStack(): ReadonlyArray<Byte> {
    return this.stack;
  }

  public getStackValue(address: number): number {
    return this.stack[address & this.stackMask].getValue();
  }

  public setStackValue(address: number, value: number): void {
    const validAddress = address & this.stackMask;
    const validValue = value & 0xFF;

    this.stack[validAddress].setValue(validValue);
    this.publishEvent(`STACK.${validAddress}`, validValue);
  }

  public clearStack(): void {
    for (const address of range(this.stack.length)) {
      this.setStackValue(address, 0);
    }
  }

  public getSPValue(): number {
    return this.getRegisterValue("SP");
  }

  public setSPValue(value: number): void {
    this.setRegisterValue("SP", value);
  }

  public clear(): void {
    this.clearStack();
    super.clear();
  }

  public clearAfterBuild(): void {
    this.clearStack();
    super.clearAfterBuild();
  }

}
