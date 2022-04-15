import { MachineState } from "./MachineState";
import { FlagCode } from "./Flag";
import { Instruction, InstructionCode } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { RegExpMatcher } from "./Utils";
import { unsignedByteToBitPattern, unsignedByteToSigned as toSigned } from "../core/Conversions";

export abstract class Machine extends MachineState {

  //////////////////////////////////////////////////
  // Step
  //////////////////////////////////////////////////

  public step(): void {
    const { fetchedValue, instruction } = this.fetchInstruction(); // Fetched value may be a byte or a word
    const { addressingModeCode, registerName, immediateAddress } = this.decodeInstruction(fetchedValue, instruction);
    this.executeInstruction(instruction, addressingModeCode, registerName, immediateAddress);
  }

  public fetchInstruction(): { fetchedValue: number, instruction: Instruction | null } {
    const fetchedValue = this.memoryReadNext(); // Read first byte
    const instruction = this.getInstructionFromValue(fetchedValue);
    return { fetchedValue, instruction };
  }

  public decodeInstruction(fetchedValue: number, instruction: Instruction | null): { addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number } {
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

  public executeInstruction(instruction: Instruction | null, addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number): void {
    let value1: number, value2: number, result: number;
    const instructionCode = (instruction) ? instruction.getInstructionCode() : InstructionCode.NOP;
    const isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE); // Used to invalidate immediate jumps

    switch (instructionCode) {

      //////////////////////////////////////////////////
      // Load/Store
      //////////////////////////////////////////////////

      case InstructionCode.LDR:
        result = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.STR:
        result = this.getRegisterValue(registerName);
        this.memoryWrite(this.memoryGetOperandAddress(immediateAddress, addressingModeCode), result);
        break;

      //////////////////////////////////////////////////
      // Arithmetic and logic
      //////////////////////////////////////////////////

      case InstructionCode.ADD:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 + value2) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry(value1 + value2 > 0xFF);
        this.setOverflow(toSigned(value1) + toSigned(value2) !== toSigned(result));
        this.updateFlags(result);
        break;

      case InstructionCode.OR:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 | value2);

        this.setRegisterValue(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.AND:
        value1 = this.getRegisterValue(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
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
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
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
        result = ((value1 >> 1) | (this.isFlagTrue("C") ? 0x80 : 0x00)) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry(value1 & 0x01);
        this.updateFlags(result);
        break;

      case InstructionCode.ROL:
        value1 = this.getRegisterValue(registerName);
        result = ((value1 << 1) | (this.isFlagTrue("C") ? 0x01 : 0x00)) & 0xFF;

        this.setRegisterValue(registerName, result);
        this.setCarry((value1 & 0x80) ? 1 : 0);
        this.updateFlags(result);
        break;

      case InstructionCode.INC:
        this.setRegisterValue(registerName, this.getRegisterValue(registerName) + 1);
        break;

      case InstructionCode.DEC:
        this.setRegisterValue(registerName, this.getRegisterValue(registerName) - 1);
        break;

      //////////////////////////////////////////////////
      // Jumps
      //////////////////////////////////////////////////

      case InstructionCode.JMP:
        if (!isImmediate) { // Invalidate immediate jumps
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JN:
        if (this.isFlagTrue("N") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JP:
        if (this.isFlagFalse("N") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JV:
        if (this.isFlagTrue("V") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNV:
        if (this.isFlagFalse("V") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JZ:
        if (this.isFlagTrue("Z") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNZ:
        if (this.isFlagFalse("Z") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JC:
        if (this.isFlagTrue("C") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNC:
        if (this.isFlagFalse("C") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JB:
        if (this.isFlagTrue("B") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNB:
        if (this.isFlagFalse("B") && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JSR:
        if (!isImmediate) {
          const jumpAddress = this.memoryGetJumpAddress(immediateAddress, addressingModeCode);
          this.memoryWrite(jumpAddress, this.getPCValue());
          this.setPCValue(jumpAddress + 1);
        }
        break;

      case InstructionCode.REG_IF:
        if (this.getRegisterValue(registerName) === 0) {
          this.setPCValue(this.getMemoryValue(immediateAddress));
        } else {
          this.setPCValue(this.getMemoryValue(immediateAddress + 1));
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

  public extractAddressingModeCode(fetchedValue: number): AddressingModeCode {
    for (const addressingMode of this.getAddressingModes()) {
      const addressingModeMatcher = new RegExpMatcher(addressingMode.getBitPattern());

      if (addressingModeMatcher.fullMatch(unsignedByteToBitPattern(fetchedValue))) {
        return addressingMode.getAddressingModeCode();
      }
    }

    throw new Error(`Addressing mode not found for fetched value: ${fetchedValue}`);
  }

  public extractRegisterName(fetchedValue: number): string {
    for (const register of this.getRegisters()) {
      if (register.matchByte(fetchedValue)) {
        return register.getName();
      }
    }

    return ""; // Undefined register
  }

  public setOverflow(state: boolean): void {
    this.setFlagValueByFlagCode(FlagCode.OVERFLOW_FLAG, state);
  }

  public setCarry(state: boolean | number): void {
    this.setFlagValueByFlagCode(FlagCode.CARRY, Boolean(state));
  }

  // Note: Some machines use carry as not borrow
  public setBorrowOrCarry(borrowState: boolean | number): void {
    if (this.hasFlag(FlagCode.BORROW)) {
      this.setFlagValueByFlagCode(FlagCode.BORROW, Boolean(borrowState));
    } else {
      this.setFlagValueByFlagCode(FlagCode.CARRY, !(borrowState));
    }
  }

  // Updates N and Z
  public updateFlags(value: number): void {
    this.setFlagValue("N", toSigned(value) < 0);
    this.setFlagValue("Z", value === 0);
  }

  //////////////////////////////////////////////////
  // Memory read/write with access count
  //////////////////////////////////////////////////

  // Increments accessCount
  public memoryRead(address: number): number {
    this.incrementAccessCount();
    return this.getMemoryValue(address);
  }

  // Increments accessCount
  public memoryWrite(address: number, value: number): void {
    this.incrementAccessCount();
    this.setMemoryValue(address, value);
  }

  // Returns value pointed to by PC, then increments PC; Increments accessCount
  public memoryReadNext(): number {
    const value = this.memoryRead(this.getPCValue());
    this.incrementPCValue();
    return value;
  }

  // Increments accessCount
  public memoryGetOperandAddress(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
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
    }
  }

  // Increments accessCount
  public memoryGetOperandValue(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    return this.memoryRead(this.memoryGetOperandAddress(immediateAddress, addressingModeCode)); // Return 1-byte value
  }

  // Increments accessCount
  public memoryGetJumpAddress(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    return this.memoryGetOperandAddress(immediateAddress, addressingModeCode);
  }

  public memoryReadTwoByteAddress(address: number): number {
    if (this.isLittleEndian()) {
      return this.toValidAddress(this.memoryRead(address) + (this.memoryRead(address + 1) << 8));
    } else {
      return this.toValidAddress((this.memoryRead(address) << 8) + this.memoryRead(address + 1)); // TODO: Untested
    }
  }

  //////////////////////////////////////////////////
  // Instruction strings
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

  public generateInstructionString(address: number): { memoryString: string, argumentsSize: number } {
    let memoryString = "";
    let argumentsSize = 0;

    // Fetch and decode instruction
    const fetchedValue = this.getMemoryValue(address);
    const instruction = this.getInstructionFromValue(this.getMemoryValue(address));
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);
    const registerName = this.extractRegisterName(fetchedValue);

    if (instruction === null || instruction.getInstructionCode() === InstructionCode.NOP || instruction.getInstructionCode() === InstructionCode.VOLTA_NOP) {
      return { memoryString, argumentsSize };
    }

    // Instruction name
    memoryString = instruction.getMnemonic().toUpperCase();

    // Register name
    if (instruction.getArguments().includes("r")) {
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

  public generateArgumentsString(address: number, instruction: Instruction, addressingModeCode: AddressingModeCode): { argument: string, argumentsSize: number } {
    let argument = String(this.getMemoryValue(address + 1));
    const addressingModePattern = this.getAddressingModePattern(addressingModeCode);

    if (addressingModePattern !== AddressingMode.NO_PATTERN) {
      // Surround argument string with the corresponding addressing mode syntax
      argument = addressingModePattern.replace("(.*)", argument).toUpperCase();
    }

    const argumentsSize = instruction.getNumBytes() - 1;
    return { argument, argumentsSize };
  }

  //////////////////////////////////////////////////
  // High-level accessors
  //////////////////////////////////////////////////

  public getDefaultDataStartingAddress(): number {
    return Math.min(this.getMemorySize() / 2, 1024);
  }

  // Used to highlight the next operand
  public getNextOperandAddress(): { intermediateAddress: number, intermediateAddressByte2: number, finalOperandAddress: number } {
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

      case AddressingModeCode.IMMEDIATE: // Immediate addressing mode
        finalOperandAddress = immediateAddress;
        break;

      case AddressingModeCode.INDEXED_BY_X: // Indexed addressing mode
        finalOperandAddress = this.toValidAddress(this.getMemoryValue(immediateAddress) + this.getRegisterValue("X"));
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        finalOperandAddress = this.toValidAddress(this.getMemoryValue(immediateAddress) + this.getRegisterValue("PC"));
        break;
    }

    return { intermediateAddress, intermediateAddressByte2, finalOperandAddress };
  }

  public getMemoryTwoByteAddress(address: number): number {
    if (this.isLittleEndian()) {
      return this.toValidAddress(this.getMemoryValue(address) + (this.getMemoryValue(address + 1) << 8));
    } else {
      return this.toValidAddress((this.getMemoryValue(address) << 8) + this.getMemoryValue(address + 1)); // TODO: Untested
    }
  }

  public hasAssemblyFormat(assemblyFormat: string): boolean {
    return Boolean(this.getInstructions().find(i => i.getAssemblyFormat() === assemblyFormat));
  }

}
