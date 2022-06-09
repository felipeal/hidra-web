import { MachineState } from "./MachineState";
import { FlagCode } from "./Flag";
import { Instruction, InstructionCode } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { unsignedByteToBitPattern, unsignedByteToSigned as toSigned } from "./utils/Conversions";
import { assert, assertUnreachable } from "./utils/FunctionUtils";

export abstract class Machine extends MachineState {

  //////////////////////////////////////////////////
  // Step
  //////////////////////////////////////////////////

  public step(): void {
    const { fetchedValue, instruction } = this.fetchInstruction();
    const { addressingModeCode, registerName, immediateAddress } = this.decodeInstruction(fetchedValue, instruction);
    this.executeInstruction(instruction, addressingModeCode, registerName, immediateAddress);
  }

  protected fetchInstruction(): { fetchedValue: number, instruction: Instruction | null } {
    const fetchedValue = this.memoryReadNext(); // Read first byte
    const instruction = this.getInstructionFromValue(fetchedValue);
    return { fetchedValue, instruction };
  }

  protected decodeInstruction(
    fetchedValue: number, instruction: Instruction | null
  ): { addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number } {
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);
    const registerName = this.extractRegisterName(fetchedValue);
    let immediateAddress = 0;

    if (instruction && instruction.getNumBytes() !== 1) { // Size can be 0 (variable number of bytes)
      immediateAddress = this.getPCValue(); // Address that contains first argument byte

      // Skip argument bytes
      const argumentNumBytes = this.calculateInstructionNumBytes(instruction, addressingModeCode) - 1;
      this.incrementPCValue(argumentNumBytes);
    }

    return { addressingModeCode, registerName, immediateAddress };
  }

  // Override this to support variable number of bytes
  public calculateInstructionNumBytes(instruction: Instruction, _addressingModeCode: AddressingModeCode): number {
    return instruction.getNumBytes();
  }

  protected executeInstruction(instruction: Instruction | null, addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number): void {
    let value1: number, value2: number, result: number;
    const instructionCode = (instruction) ? instruction.getInstructionCode() : InstructionCode.NOP;
    const isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE); // Used to invalidate immediate jumps

    switch (instructionCode) {

      //////////////////////////////////////////////////
      // Load/Store
      //////////////////////////////////////////////////

      case InstructionCode.LDR:
        result = this.memoryReadOperandValue(immediateAddress, addressingModeCode);
        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.STR:
        result = this.getRegisterValue(registerName);
        this.memoryWrite(this.memoryReadOperandAddress(immediateAddress, addressingModeCode), result);
        break;

      //////////////////////////////////////////////////
      // Arithmetic and logic
      //////////////////////////////////////////////////

      case InstructionCode.ADD:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryReadOperandValue(immediateAddress, addressingModeCode);
        result = (value1 + value2) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry(value1 + value2 > 0xFF);
        this.setOverflow(toSigned(value1) + toSigned(value2) !== toSigned(result));
        this.updateFlags(result);
        break;

      case InstructionCode.OR:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryReadOperandValue(immediateAddress, addressingModeCode);
        result = (value1 | value2);

        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.AND:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryReadOperandValue(immediateAddress, addressingModeCode);
        result = (value1 & value2);

        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.NOT:
        value1 = this.getRegisterValue(registerName);
        result = ~value1 & 0xFF;

        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.SUB:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryReadOperandValue(immediateAddress, addressingModeCode);
        result = (value1 - value2) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setBorrowOrCarry(value1 < value2);
        this.setOverflow(toSigned(value1) - toSigned(value2) !== toSigned(result));
        this.updateFlags(result);
        break;

      case InstructionCode.NEG:
        value1 = this.getRegisterValue(registerName);
        result = (-value1) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setBorrowOrCarry(value1 !== 0); // Borrows when (0 - value1) is negative
        this.updateFlags(result);
        break;

      case InstructionCode.SHR:
        value1 = this.getRegisterValue(registerName);
        result = (value1 >> 1) & 0xFF; // Logical shift (unsigned)

        this.setRegisterValue(registerName, result);
        this.setCarry(value1 & 0x01);
        this.updateFlags(result);
        break;

      case InstructionCode.SHL:
        value1 = this.getRegisterValue(registerName);
        result = (value1 << 1) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry((value1 & 0x80) ? 1 : 0);
        this.updateFlags(result);
        break;

      case InstructionCode.ROR:
        value1 = this.getRegisterValue(registerName);
        result = ((value1 >> 1) | (this.getFlagBit("C") << 7)) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry(value1 & 0x01);
        this.updateFlags(result);
        break;

      case InstructionCode.ROL:
        value1 = this.getRegisterValue(registerName);
        result = ((value1 << 1) | this.getFlagBit("C")) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry((value1 & 0x80) ? 1 : 0);
        this.updateFlags(result);
        break;

      //////////////////////////////////////////////////
      // Jumps
      //////////////////////////////////////////////////

      case InstructionCode.JMP:
        if (!isImmediate) { // Invalidate immediate jumps
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JN:
        if (this.isFlagTrue("N") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JP:
        if (this.isFlagFalse("N") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JV:
        if (this.isFlagTrue("V") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNV:
        if (this.isFlagFalse("V") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JZ:
        if (this.isFlagTrue("Z") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNZ:
        if (this.isFlagFalse("Z") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JC:
        if (this.isFlagTrue("C") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNC:
        if (this.isFlagFalse("C") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JB:
        if (this.isFlagTrue("B") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNB:
        if (this.isFlagFalse("B") && !isImmediate) {
          this.setPCValue(this.memoryReadJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JSR:
        if (!isImmediate) {
          const jumpAddress = this.memoryReadJumpAddress(immediateAddress, addressingModeCode);
          this.memoryWrite(jumpAddress, this.getPCValue());
          this.setPCValue(jumpAddress + 1);
        }
        break;

      //////////////////////////////////////////////////
      // Halt
      //////////////////////////////////////////////////

      case InstructionCode.HLT:
        this.setRunning(false);
        break;

      default: // NOP etc.
        break;

    }

    this.incrementInstructionCount();
  }

  protected extractAddressingModeCode(fetchedValue: number): AddressingModeCode {
    const bitPattern = unsignedByteToBitPattern(fetchedValue);
    const addressingMode = this.getAddressingModes().find(m => m.matchesBitPattern(bitPattern));
    assert(addressingMode, `Addressing mode not found for fetched value: ${fetchedValue}`);
    return addressingMode.getAddressingModeCode();
  }

  protected extractRegisterName(fetchedValue: number): string {
    for (const register of this.getRegisters()) {
      if (register.matchByte(fetchedValue)) {
        return register.getName();
      }
    }

    return ""; // Undefined register
  }

  protected setOverflow(state: boolean): void {
    this.setFlagValueByFlagCode(FlagCode.OVERFLOW, state);
  }

  protected setCarry(state: boolean | number): void {
    this.setFlagValueByFlagCode(FlagCode.CARRY, Boolean(state));
  }

  // Note: Some machines use carry as not borrow
  protected setBorrowOrCarry(borrowState: boolean | number): void {
    if (this.hasFlag(FlagCode.BORROW)) {
      this.setFlagValueByFlagCode(FlagCode.BORROW, Boolean(borrowState));
    } else {
      this.setFlagValueByFlagCode(FlagCode.CARRY, !(borrowState));
    }
  }

  // Updates N and Z
  protected updateFlags(value: number): void {
    this.setFlagValue("N", toSigned(value) < 0);
    this.setFlagValue("Z", value === 0);
  }

  //////////////////////////////////////////////////
  // Memory read/write with access count
  //////////////////////////////////////////////////

  // Increments accessCount
  protected memoryRead(address: number): number {
    this.incrementAccessCount();
    return this.getMemoryValue(address);
  }

  // Increments accessCount
  protected memoryWrite(address: number, value: number): void {
    this.incrementAccessCount();
    this.setMemoryValue(address, value);
  }

  // Returns value pointed to by PC, then increments PC. Increments accessCount.
  protected memoryReadNext(): number {
    const value = this.memoryRead(this.getPCValue());
    this.incrementPCValue();
    return value;
  }

  // Increments accessCount
  protected memoryReadOperandAddress(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT:
        return this.memoryRead(immediateAddress);

      case AddressingModeCode.INDIRECT:
        return this.memoryRead(this.memoryRead(immediateAddress));

      case AddressingModeCode.IMMEDIATE:
        return immediateAddress;

      case AddressingModeCode.INDEXED_BY_X:
        return this.toValidAddress(this.memoryRead(immediateAddress) + this.getRegisterValue("X"));

      case AddressingModeCode.INDEXED_BY_PC:
        return this.toValidAddress(this.memoryRead(immediateAddress) + this.getRegisterValue("PC"));

      default:
        assertUnreachable(`Unsupported addressing mode: ${addressingModeCode}`);
    }
  }

  // Increments accessCount
  protected memoryReadOperandValue(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    return this.memoryRead(this.memoryReadOperandAddress(immediateAddress, addressingModeCode)); // Return 1-byte value
  }

  // Increments accessCount
  protected memoryReadJumpAddress(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    return this.memoryReadOperandAddress(immediateAddress, addressingModeCode);
  }

  // Increments accessCount
  protected memoryReadTwoByteAddress(address: number): number {
    if (this.isLittleEndian()) {
      return this.toValidAddress(this.memoryRead(address) + (this.memoryRead(address + 1) << 8));
    } else {
      return this.toValidAddress((this.memoryRead(address) << 8) + this.memoryRead(address + 1)); // TODO: Untested
    }
  }

  //////////////////////////////////////////////////
  // Disassembler (instruction strings)
  //////////////////////////////////////////////////

  public updateInstructionStrings(): void {
    let address = 0, pendingArgumentBytes = 0;
    let pcReached = false;

    while (address < this.getMemorySize()) {
      // Realign interpretation to PC when PC is reached
      if (!pcReached && address >= this.getPCValue()) {
        address = this.getPCValue();
        pendingArgumentBytes = 0;
        pcReached = true;
      }

      if (pendingArgumentBytes === 0) { // Used to skip argument lines
        const { memoryString, argumentsSize } = this.generateInstructionString(address);
        pendingArgumentBytes = argumentsSize;
        this.setInstructionString(address, memoryString);
      } else { // Skip instruction's arguments (leave empty strings)
        this.setInstructionString(address, "");
        pendingArgumentBytes -= 1;
      }

      address += 1;
    }
  }

  protected generateInstructionString(address: number): { memoryString: string, argumentsSize: number } {
    let memoryString = "";
    let argumentsSize = 0;

    // Fetch and decode instruction
    const fetchedValue = this.getMemoryValue(address);
    const instruction = this.getInstructionFromValue(fetchedValue);
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);
    const registerName = this.extractRegisterName(fetchedValue);

    if (instruction === null || instruction.getInstructionCode() === InstructionCode.NOP) {
      return { memoryString, argumentsSize };
    }

    // Instruction name
    memoryString = instruction.getMnemonic().toUpperCase();

    // Register name
    if (instruction.hasParameter("r")) {
      memoryString += " " + ((registerName !== "") ? registerName : "?");
    }

    // Argument value (with addressing mode)
    if (instruction.getNumBytes() !== 1) { // Size can be 0 (variable number of bytes)
      const { argument, argumentsSize: newArgumentsSize } = this.generateArgumentsString(address, instruction, addressingModeCode);
      memoryString += " " + argument;
      argumentsSize = newArgumentsSize;
    }

    return { memoryString, argumentsSize };
  }

  protected generateArgumentsString(
    address: number, instruction: Instruction, addressingModeCode: AddressingModeCode
  ): { argument: string, argumentsSize: number } {
    let argument = String(this.getMemoryValue(address + 1));
    const addressingModePattern = this.getAddressingModePattern(addressingModeCode);

    if (addressingModePattern !== AddressingMode.NO_PATTERN) {
      // Surround argument string with the corresponding addressing mode syntax
      argument = addressingModePattern.replace("a", argument);
    }

    const argumentsSize = instruction.getNumBytes() - 1;
    return { argument, argumentsSize };
  }

  //////////////////////////////////////////////////
  // High-level accessors
  //////////////////////////////////////////////////

  public clearAfterBuild(): void {
    this.clearRegisters();
    this.resetFlags();
    this.clearCounters();
    this.clearInstructionStrings();

    this.setRunning(false);
  }

  public getDefaultDataStartingAddress(): number {
    return Math.min(this.getMemorySize() / 2, 1024);
  }

  // Used to highlight the next operand
  public previewNextOperandAddress(): { intermediateAddress: number, intermediateAddressByte2: number, finalOperandAddress: number } {
    const fetchedValue = this.getMemoryValue(this.getPCValue());
    const instruction = this.getInstructionFromValue(fetchedValue);
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);

    let intermediateAddress = -1;
    const intermediateAddressByte2 = -1;
    let finalOperandAddress = -1;

    if (!instruction || instruction.getNumBytes() !== 2) {
      return { intermediateAddress, intermediateAddressByte2, finalOperandAddress };
    }

    const immediateAddress = this.toValidAddress(this.getPCValue() + 1);

    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT:
        finalOperandAddress = this.getMemoryValue(immediateAddress);
        break;

      case AddressingModeCode.INDIRECT:
        intermediateAddress = this.getMemoryValue(immediateAddress);
        finalOperandAddress = this.getMemoryValue(intermediateAddress);
        break;

      case AddressingModeCode.IMMEDIATE:
        finalOperandAddress = immediateAddress;
        break;

      case AddressingModeCode.INDEXED_BY_X:
        finalOperandAddress = this.toValidAddress(this.getMemoryValue(immediateAddress) + this.getRegisterValue("X"));
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        // PC will be pointing to the next instruction in memory
        finalOperandAddress = this.toValidAddress(this.getMemoryValue(immediateAddress) + this.getRegisterValue("PC") + instruction.getNumBytes());
        break;
    }

    return { intermediateAddress, intermediateAddressByte2, finalOperandAddress };
  }

  protected getMemoryTwoByteAddress(address: number): number {
    if (this.isLittleEndian()) {
      return this.toValidAddress(this.getMemoryValue(address) + (this.getMemoryValue(address + 1) << 8));
    } else {
      return this.toValidAddress((this.getMemoryValue(address) << 8) + this.getMemoryValue(address + 1)); // TODO: Untested
    }
  }

  protected addValueToRegister(registerName: string, value: number): number {
    this.setRegisterValue(registerName, this.getRegisterValue(registerName) + value);
    return this.getRegisterValue(registerName);
  }

  protected subtractValueFromRegister(registerName: string, value: number): number {
    this.setRegisterValue(registerName, this.getRegisterValue(registerName) - value);
    return this.getRegisterValue(registerName);
  }

  public hasAssemblyFormat(assemblyFormat: string): boolean {
    return Boolean(this.getInstructions().find(i => i.getAssemblyFormat() === assemblyFormat));
  }

}
