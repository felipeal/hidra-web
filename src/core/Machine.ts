/*

TODO:
thrown Errors
.exec()

*/

import { Register } from "./Register";
import { FlagCode } from "./Flag";
import { Instruction, InstructionCode } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { Conversion } from "./Conversion";
import { QRegExp } from "./Utils";
import { MachineState } from "./MachineState";

enum FileErrorCode {
  NO_ERROR = 0,
  INPUT_OUTPUT,
  INCORRECT_SIZE,
  INVALID_IDENTIFIER,
}

enum MachineErrorCode {
  NO_ERROR = 0,
  WRONG_NUMBER_OF_ARGUMENTS,
  INVALID_INSTRUCTION,
  INVALID_ADDRESS,
  INVALID_VALUE,
  INVALID_STRING,
  INVALID_LABEL,
  INVALID_ARGUMENT,
  DUPLICATE_LABEL,
  MEMORY_OVERLAP,
  NOT_IMPLEMENTED,
  UNDEFINED_ERROR,
}

class MachineError extends Error {

  errorCode: MachineErrorCode;

  constructor(errorCode: MachineErrorCode) {
    super();
    this.errorCode = errorCode;
  }

}

export abstract class Machine extends MachineState {

  // Constants
  static readonly ALLOCATE_SYMBOL = "%";
  static readonly QUOTE_SYMBOL = "¢";

  //////////////////////////////////////////////////
  // Step
  //////////////////////////////////////////////////

  //#region Step

  public step(): void {
    const { fetchedValue, instruction } = this.fetchInstruction(); // Fetched value may be a byte or a word
    const { addressingModeCode, registerName, immediateAddress } = this.decodeInstruction(fetchedValue, instruction);
    this.executeInstruction(instruction, addressingModeCode, registerName, immediateAddress);

    if (this.getPCValue() === this.getBreakpoint()) {
      this.setRunning(false);
    }
  }

  public fetchInstruction(): { fetchedValue: number, instruction: Instruction | null } {
    // Read first byte
    const fetchedValue = this.memoryReadNext();
    const instruction = this.getInstructionFromValue(fetchedValue);
    return { fetchedValue, instruction };
  }

  public decodeInstruction(fetchedValue: number, instruction: Instruction | null): { addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number } {
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);
    const registerName = this.extractRegisterName(fetchedValue);
    let immediateAddress = 0;

    if (instruction && instruction.getNumBytes() > 1) {
      immediateAddress = this.getPCValue(); // Address that contains first argument byte
      this.incrementPCValue(instruction.getNumBytes() - 1); // Skip argument bytes
    }

    return { addressingModeCode, registerName, immediateAddress };
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
        this.setRegisterValueByName(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.STR:
        result = this.getRegisterValueByName(registerName);
        this.memoryWrite(this.memoryGetOperandAddress(immediateAddress, addressingModeCode), result);
        break;

      //////////////////////////////////////////////////
      // Arithmetic and logic
      //////////////////////////////////////////////////

      case InstructionCode.ADD:
        value1 = this.getRegisterValueByName(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 + value2) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.setCarry(value1 + value2 > 0xFF);
        this.setOverflow(this.toSigned(value1) + this.toSigned(value2) !== this.toSigned(result));
        this.updateFlags(result);
        break;

      case InstructionCode.OR:
        value1 = this.getRegisterValueByName(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 | value2);

        this.setRegisterValueByName(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.AND:
        value1 = this.getRegisterValueByName(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 & value2);

        this.setRegisterValueByName(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.NOT:
        value1 = this.getRegisterValueByName(registerName);
        result = ~value1 & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.SUB:
        value1 = this.getRegisterValueByName(registerName);
        value2 = this.memoryGetOperandValue(immediateAddress, addressingModeCode);
        result = (value1 - value2) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.setBorrowOrCarry(value1 < value2);
        this.setOverflow(this.toSigned(value1) - this.toSigned(value2) !== this.toSigned(result));
        this.updateFlags(result);
        break;

      case InstructionCode.NEG:
        value1 = this.getRegisterValueByName(registerName);
        result = (-value1) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.updateFlags(result);
        break;

      case InstructionCode.SHR:
        value1 = this.getRegisterValueByName(registerName);
        result = (value1 >> 1) & 0xFF; // Logical shift (unsigned)

        this.setRegisterValueByName(registerName, result);
        this.setCarry(value1 & 0x01);
        this.updateFlags(result);
        break;

      case InstructionCode.SHL:
        value1 = this.getRegisterValueByName(registerName);
        result = (value1 << 1) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.setCarry((value1 & 0x80) ? 1 : 0);
        this.updateFlags(result);
        break;

      case InstructionCode.ROR:
        value1 = this.getRegisterValueByName(registerName);
        result = ((value1 >> 1) | (this.getFlagValueByName("C") === true ? 0x80 : 0x00)) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.setCarry(value1 & 0x01);
        this.updateFlags(result);
        break;

      case InstructionCode.ROL:
        value1 = this.getRegisterValueByName(registerName);
        result = ((value1 << 1) | (this.getFlagValueByName("C") === true ? 0x01 : 0x00)) & 0xFF;

        this.setRegisterValueByName(registerName, result);
        this.setCarry((value1 & 0x80) ? 1 : 0);
        this.updateFlags(result);
        break;

      case InstructionCode.INC:
        this.setRegisterValueByName(registerName, this.getRegisterValueByName(registerName) + 1);
        break;

      case InstructionCode.DEC:
        this.setRegisterValueByName(registerName, this.getRegisterValueByName(registerName) - 1);
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
        if (this.getFlagValueByName("N") === true && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JP:
        if (this.getFlagValueByName("N") === false && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JV:
        if (this.getFlagValueByName("V") === true && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNV:
        if (this.getFlagValueByName("V") === false && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JZ:
        if (this.getFlagValueByName("Z") === true && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNZ:
        if (this.getFlagValueByName("Z") === false && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JC:
        if (this.getFlagValueByName("C") === true && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNC:
        if (this.getFlagValueByName("C") === false && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JB:
        if (this.getFlagValueByName("B") === true && !isImmediate) {
          this.setPCValue(this.memoryGetJumpAddress(immediateAddress, addressingModeCode));
        }
        break;

      case InstructionCode.JNB:
        if (this.getFlagValueByName("B") === false && !isImmediate) {
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
        if (this.getRegisterValueByName(registerName) === 0) {
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
      const matchAddressingMode = new QRegExp(addressingMode.getBitPattern());

      if (matchAddressingMode.exactMatch(Conversion.valueToString(fetchedValue))) {
        return addressingMode.getAddressingModeCode();
      }
    }

    throw Error("Addressing mode not found.");
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
    this.setFlagValueByName("N", this.toSigned(value) < 0);
    this.setFlagValueByName("Z", value === 0);
  }

  // Returns a valid address based on a value, removing excess bits (overflow)
  public address(value: number): number {
    return (value & (this.getMemorySize() - 1)); // Bit-and, removes excess bits
  }

  public toSigned(unsignedByte: number): number {
    if (unsignedByte <= 127) { // Max signed byte
      return unsignedByte;
    } else {
      return unsignedByte - 256;
    }
  }

  //#endregion

  //////////////////////////////////////////////////
  // Assembler
  //////////////////////////////////////////////////

  //#region Assembler

  // Returns an array of error messages on failure
  public assemble(sourceCode: string): string[] {
    this.setRunning(false);
    this.buildSuccessful = false;
    this.firstErrorLine = -1;

    const errorMessages: string[] = [];

    //////////////////////////////////////////////////
    // Regular expressions
    //////////////////////////////////////////////////

    const validLabel = new QRegExp("[a-z_][a-z0-9_]*"); // Validates label names (must start with a letter/underline, may have numbers)
    const whitespace = new QRegExp("\\s+");

    //////////////////////////////////////////////////
    // Simplify source code
    //////////////////////////////////////////////////

    const sourceLines = sourceCode.split(/\r?\n/); // Split source code to individual lines

    // Strip comments and extra spaces
    for (let lineNumber = 0; lineNumber < sourceLines.length; lineNumber++) {
      // Convert literal quotes to special symbol
      sourceLines[lineNumber] = sourceLines[lineNumber].replaceAll("''''", "'" + Machine.QUOTE_SYMBOL); // '''' . 'QUOTE_SYMBOL
      sourceLines[lineNumber] = sourceLines[lineNumber].replaceAll("'''", Machine.QUOTE_SYMBOL); // ''' . QUOTE_SYMBOL

      // Remove comments
      sourceLines[lineNumber] = this.removeComment(sourceLines[lineNumber]);

      // Trim whitespace
      sourceLines[lineNumber] = sourceLines[lineNumber].trim();
    }

    //////////////////////////////////////////////////
    // FIRST PASS: Read labels, reserve memory
    //////////////////////////////////////////////////

    this.clearAssemblerData();
    this.setPCValue(0);

    for (let lineNumber = 0; lineNumber < sourceLines.length; lineNumber++) {
      try {

        //////////////////////////////////////////////////
        // Read labels
        //////////////////////////////////////////////////

        if (sourceLines[lineNumber].includes(":")) { // If getLabel found a label
          const labelName = sourceLines[lineNumber].split(":")[0];

          // Check for invalid or duplicated label
          if (!validLabel.exactMatch(labelName.toLowerCase())) {
            throw new MachineError(MachineErrorCode.INVALID_LABEL);
          }
          if (this.labelPCMap.has(labelName.toLowerCase())) {
            throw new MachineError(MachineErrorCode.DUPLICATE_LABEL);
          }

          this.labelPCMap.set(labelName.toLowerCase(), this.getPCValue()); // Add to map
          this.setAddressCorrespondingLabel(this.getPCValue(), labelName);
          sourceLines[lineNumber] = sourceLines[lineNumber].replaceAll(labelName + ":", "").trim(); // Remove label from sourceLines
        }

        //////////////////////////////////////////////////
        // Reserve memory for instructions/directives
        //////////////////////////////////////////////////

        if (sourceLines[lineNumber].length > 0) {
          const mnemonic = sourceLines[lineNumber].split(whitespace)[0].toLowerCase();

          const instruction = this.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            let numBytes = instruction.getNumBytes();

            if (numBytes === 0) { // If instruction has variable number of bytes
              const addressArgument = sourceLines[lineNumber].split(whitespace).slice(-1).join(" "); // Last argument
              numBytes = this.calculateBytesToReserve(addressArgument);
            }

            this.reserveAssemblerMemory(numBytes, lineNumber);
          } else { // Directive
            const args = sourceLines[lineNumber].split(whitespace).slice(1).join(" "); // Everything after mnemonic
            this.obeyDirective(mnemonic, args, true, lineNumber);
          }
        }
      } catch (error: unknown) {
        if (error instanceof MachineError) {
          if (this.firstErrorLine === -1) {
            this.firstErrorLine = lineNumber;
          }
          errorMessages.push(this.buildError(lineNumber, error.errorCode));
        } else {
          throw error;
        }
      }
    }

    if (this.firstErrorLine >= 0) {
      return errorMessages; // Error(s) found, abort compilation
    }

    //////////////////////////////////////////////////
    // SECOND PASS: Build instructions/defines
    //////////////////////////////////////////////////

    this.sourceLineCorrespondingAddress = new Array(sourceLines.length).fill(-1);
    this.setPCValue(0);

    for (let lineNumber = 0; lineNumber < sourceLines.length; lineNumber++) {
      try {
        this.sourceLineCorrespondingAddress[lineNumber] = this.getPCValue();

        if (sourceLines[lineNumber].length > 0) {
          const mnemonic = sourceLines[lineNumber].split(whitespace)[0].toLowerCase();
          const args = sourceLines[lineNumber].split(whitespace).slice(1).join(" "); // Everything after mnemonic

          const instruction: Instruction | null = this.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            this.buildInstruction(instruction, args);
          } else { // Directive
            this.obeyDirective(mnemonic, args, false, lineNumber);
          }
        }
      } catch (error: unknown) {
        if (error instanceof MachineError) {
          if (this.firstErrorLine === -1) {
            this.firstErrorLine = lineNumber;
          }
          errorMessages.push(this.buildError(lineNumber, error.errorCode));
        } else {
          throw error;
        }
      }
    }

    if (this.firstErrorLine >= 0) {
      return errorMessages; // Error(s) found, abort compilation
    }

    this.buildSuccessful = true;

    this.copyAssemblerMemoryToMemory();
    this.clearAfterBuild();

    return [];
  }

  public removeComment(line: string) {
    let isInsideString = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "'") {
        isInsideString = !isInsideString;
      } else if (line[i] === ";" && !isInsideString) {
        return line.slice(0, i);
      }
    }
    return line;
  }

  // Mnemonic must be lowercase
  public obeyDirective(mnemonic: string, args: string, reserveOnly: boolean, sourceLine: number): void {
    const whitespace = new QRegExp("\\s+");

    if (mnemonic === "org") {
      const argumentList = args.trim().split(whitespace).filter(argument => /\S/.test(argument)); // Filters out empty strings
      const numberOfArguments = argumentList.length;

      if (numberOfArguments !== 1) {
        throw new MachineError(MachineErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
      }
      if (!this.isValidOrg(argumentList[0])) {
        throw new MachineError(MachineErrorCode.INVALID_ADDRESS);
      }

      this.setPCValue(this.stringToInt(argumentList[0]));
    } else if (new QRegExp("db|dw|dab|daw").exactMatch(mnemonic)) {
      const argumentList = this.splitArguments(args);

      let numberOfArguments = argumentList.length;
      const bytesPerArgument = (mnemonic === "db" || mnemonic === "dab") ? 1 : 2;
      const isArray = (mnemonic === "dab" || mnemonic === "daw") ? true : false;

      if (bytesPerArgument === 1 && numberOfArguments === 0) {
        argumentList.push("0"); // Default to argument 0 in case of DB and DW
        numberOfArguments = 1;
      }

      if (!isArray && numberOfArguments > 1) { // Too many arguments
        throw new MachineError(MachineErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
      }

      if (isArray && numberOfArguments < 1) { // No arguments
        throw new MachineError(MachineErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
      }

      // Memory allocation
      if (argumentList[0][0] === Machine.ALLOCATE_SYMBOL) {
        if (mnemonic !== "dab" && mnemonic !== "daw") {
          throw new MachineError(MachineErrorCode.INVALID_ARGUMENT);
        } else if (reserveOnly) {
          this.reserveAssemblerMemory(Number(argumentList[0].slice(1)) * bytesPerArgument, sourceLine); // TODO: Is this correct?
        } else { // Skip bytes
          this.incrementPCValue(Number(argumentList[0].slice(1)) * bytesPerArgument);
        }
      } else if (reserveOnly) {
        this.reserveAssemblerMemory(numberOfArguments * bytesPerArgument, sourceLine); // Increments PC
      } else {
        // Process each argument
        for (const argument of argumentList) {
          // TODO: Should DAB/DAW disallow labels as in Daedalus?
          const value = this.argumentToValue(argument, true, bytesPerArgument);

          // Write value
          if (bytesPerArgument === 2 && this.littleEndian) {
            this.setAssemblerMemoryNext(value & 0xFF); // Least significant byte first
            this.setAssemblerMemoryNext((value >> 8) & 0xFF);
          } else if (bytesPerArgument === 2) { // Big endian
            this.setAssemblerMemoryNext((value >> 8) & 0xFF); // Most significant byte first
            this.setAssemblerMemoryNext(value & 0xFF);
          } else {
            this.setAssemblerMemoryNext(value & 0xFF);
          }
        }
      }
    } else {
      throw new MachineError(MachineErrorCode.INVALID_INSTRUCTION);
    }
  }

  public buildInstruction(instruction: Instruction, args: string): void {
    const whitespace = new QRegExp("\\s+");

    const argumentList = args.split(whitespace).filter(argument => /\S/.test(argument)); // Filters out empty strings
    const instructionArguments = instruction.getArguments(); let isImmediate = false;
    let registerBitCode = 0b00000000;
    let addressingModeBitCode = 0b00000000;

    // Check if number of arguments is correct:
    if (argumentList.length !== instruction.getNumberOfArguments()) {
      throw new MachineError(MachineErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
    }

    // If argumentList contains a register:
    if (instructionArguments.includes("r")) {
      registerBitCode = this.getRegisterBitCode(argumentList[0]);

      if (registerBitCode === Register.NO_BIT_CODE) {
        throw new MachineError(MachineErrorCode.INVALID_ARGUMENT); // Register not found (or invisible)
      }
    }

    // If argumentList contains an address/value:
    if (instructionArguments.includes("a")) {
      const { argument: newArgument, addressingModeCode } = this.extractArgumentAddressingModeCode(argumentList[argumentList.length - 1]); // Removes addressing mode from argument
      argumentList[argumentList.length - 1] = newArgument; // TODO: Refactor
      addressingModeBitCode = this.getAddressingModeBitCode(addressingModeCode);
      isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE);
    }

    // Write first byte (instruction with register and addressing mode):
    this.setAssemblerMemoryNext(instruction.getByteValue() | registerBitCode | addressingModeBitCode);

    // Write second byte (if 1-byte address/immediate value):
    if (instruction.getNumBytes() === 2 || isImmediate) {
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[argumentList.length - 1], isImmediate)); // Converts labels, chars, etc.

      // Write second and third bytes (if 2-byte addresses):
    } else if (instructionArguments.includes("a")) {
      const address = this.argumentToValue(argumentList[argumentList.length - 1], isImmediate);

      this.setAssemblerMemoryNext(address & 0xFF); // Least significant byte (little-endian)
      this.setAssemblerMemoryNext((address >> 8) & 0xFF); // Most significant byte

      // If instruction has two addresses (REG_IF), write both addresses:
    } else if (instructionArguments.includes("a0") && instructionArguments.includes("a1")) {
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instructionArguments.indexOf("a0")], false));
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instructionArguments.indexOf("a1")], false));
    }
  }

  public buildError(lineNumber: number, errorCode: MachineErrorCode): string {
    let errorString = "";
    errorString += "Linha " + String(lineNumber + 1) + ": ";

    const errorMessages: Map<MachineErrorCode, string> = new Map();
    errorMessages.set(MachineErrorCode.WRONG_NUMBER_OF_ARGUMENTS, "Número de argumentos inválido.");
    errorMessages.set(MachineErrorCode.INVALID_INSTRUCTION, "Mnemônico inválido.");
    errorMessages.set(MachineErrorCode.INVALID_ADDRESS, "Endereço inválido.");
    errorMessages.set(MachineErrorCode.INVALID_VALUE, "Valor inválido.");
    errorMessages.set(MachineErrorCode.INVALID_STRING, "String inválido.");
    errorMessages.set(MachineErrorCode.INVALID_LABEL, "Label inválido.");
    errorMessages.set(MachineErrorCode.INVALID_ARGUMENT, "Argumento inválido.");
    errorMessages.set(MachineErrorCode.DUPLICATE_LABEL, "Label já definido.");
    errorMessages.set(MachineErrorCode.MEMORY_OVERLAP, "Sobreposição de memória.");
    errorMessages.set(MachineErrorCode.NOT_IMPLEMENTED, "Funcionalidade não implementada.");
    errorMessages.set(MachineErrorCode.UNDEFINED_ERROR, "Erro indefinido.");

    if (errorMessages.has(errorCode)) {
      errorString += errorMessages.get(errorCode);
    } else {
      errorString += errorMessages.get(MachineErrorCode.UNDEFINED_ERROR);
    }

    return errorString;
  }

  // Increments PC
  public setAssemblerMemoryNext(value: number): void {
    this.assemblerMemory[this.getPCValue()].setValue(value);
    this.incrementPCValue();
  }

  // Copies assemblerMemory to machine's memory
  public copyAssemblerMemoryToMemory(): void {
    for (let i = 0; i < this.getMemorySize(); i++) {
      // Copy only different values to avoid marking bytes as changed
      if (this.getMemoryValue(i) !== this.assemblerMemory[i].getValue()) {
        this.setMemoryValue(i, this.assemblerMemory[i].getValue());
      }
    }
  }

  // Reserve 'sizeToReserve' bytes starting from PC, associate addresses with a source line. Throws exception on overlap.
  public reserveAssemblerMemory(sizeToReserve: number, associatedSourceLine: number): void {
    while (sizeToReserve > 0) {
      if (!this.reserved[this.getPCValue()]) {
        this.reserved[this.getPCValue()] = true;
        this.addressCorrespondingSourceLine[this.getPCValue()] = associatedSourceLine;
        this.incrementPCValue();
        sizeToReserve--;
      } else {
        throw new MachineError(MachineErrorCode.MEMORY_OVERLAP); // Memory already reserved
      }
    }
  }

  // Method for machines that require the addressing mode to reserve memory.
  public calculateBytesToReserve(_addressArgument: string): number {
    return 0;
  }

  public isValidValue(valueString: string, min: number, max: number): boolean {
    let ok = false;
    let value: number;

    if (valueString.toLowerCase().startsWith("h")) {
      value = parseInt(valueString.slice(1), 16); // Remove "h"
      ok = /^[0-9A-Fa-f]+$/.test(valueString.slice(1)) && !isNaN(value);
    } else {
      value = parseInt(valueString, 10);
      ok = /^-?\d+$/.test(valueString) && !isNaN(value);
    }

    // Returns true if conversion ok and value between min and max
    return (ok && value >= min && value <= max);
  }

  // Checks if string is a valid number for the machine
  public isValidNBytesValue(valueString: string, n: number): boolean {
    if (n === 1) {
      return this.isValidValue(valueString, -128, 255);
    } else {
      return this.isValidValue(valueString, -32768, 65535);
    }
  }

  public isValidByteValue(valueString: string): boolean { // FIXME: Unused
    return this.isValidValue(valueString, -128, 255);
  }

  public isValidAddress(addressString: string): boolean { // Allows negative values for offsets
    return this.isValidValue(addressString, -this.getMemorySize(), this.getMemorySize() - 1);
  }

  public isValidOrg(offsetString: string): boolean {
    return this.isValidValue(offsetString, 0, this.getMemorySize() - 1);
  }

  public splitArguments(args: string): string[] {
    const finalArgumentList: string[] = [];

    // Regular expressions
    const matchBrackets = new QRegExp("\\[(\\d+)\\]"); // Digits between brackets

    const VALUE = "([^'\\s,]+)";
    const STRING = "('[^']+')";
    const SEPARATOR = "([,\\s]*|$)";

    const matchArgumentString = "(" + VALUE + "|" + STRING + ")" + SEPARATOR;
    const matchArgument = new RegExp(matchArgumentString, "gi");

    args = args.trim(); // Trim whitespace

    //////////////////////////////////////////////////
    // Byte/Word allocation
    //////////////////////////////////////////////////

    if (matchBrackets.exactMatch(args)) {
      finalArgumentList.push(Machine.ALLOCATE_SYMBOL + matchBrackets.cap(1));
      return finalArgumentList;
    }

    //////////////////////////////////////////////////
    // Process string
    //////////////////////////////////////////////////

    let currentMatch = matchArgument.exec(args);
    let totalMatchedLength = 0;

    // TODO: Untested

    while (currentMatch) { // While there are arguments
      let argument = currentMatch[1];

      // Ascii string
      if (argument.includes("'")) {
        argument = argument.replaceAll("'", "");
        for (const c of argument.split("")) {
          finalArgumentList.push(`'${c}'`); // Char between single quotes
        }
      } else { // Value
        finalArgumentList.push(argument);
      }

      totalMatchedLength += currentMatch[0].length;

      currentMatch = matchArgument.exec(args);
    }

    if (totalMatchedLength !== args.length) { // If not fully matched, an error occurred
      throw new MachineError(MachineErrorCode.INVALID_STRING);
    }

    return finalArgumentList;
  }

  public extractArgumentAddressingModeCode(argument: string): { argument: string, addressingModeCode: AddressingModeCode } {
    let addressingModeCode = this.getDefaultAddressingModeCode();

    for (const addressingMode of this.getAddressingModes()) {
      const matchAddressingMode = addressingMode.getAssemblyRegExp();

      if (matchAddressingMode.exactMatch(argument)) {
        argument = matchAddressingMode.cap(1); // Remove addressing mode
        addressingModeCode = addressingMode.getAddressingModeCode();
        break;
      }
    }

    return { argument, addressingModeCode };
  }

  public argumentToValue(argument: string, isImmediate: boolean, immediateNumBytes = 1): number {
    const matchChar = new QRegExp("'.'");
    const labelOffset = new QRegExp("(.+)(\\+|\\-)(.+)"); // (label) (+|-) (offset)

    // Convert label with +/- offset to number
    if (labelOffset.exactMatch(argument.toLowerCase())) {
      const sign = (labelOffset.cap(2) === "+") ? +1 : -1;

      if (!this.labelPCMap.has(labelOffset.cap(1))) { // Validate label
        throw new MachineError(MachineErrorCode.INVALID_LABEL);
      }
      if (!this.isValidAddress(labelOffset.cap(3))) { // Validate offset
        throw new MachineError(MachineErrorCode.INVALID_ARGUMENT);
      }

      // Argument = Label + Offset
      argument = String(this.labelPCMap.get(labelOffset.cap(1))! + sign * this.stringToInt(labelOffset.cap(3)));
    }

    // Convert label to number string
    if (this.labelPCMap.has(argument.toLowerCase())) {
      argument = String(this.labelPCMap.get(argument.toLowerCase()));
    }

    if (isImmediate) {
      if (argument.includes(Machine.QUOTE_SYMBOL)) { // Immediate quote
        return "'".charCodeAt(0);
      } else if (matchChar.exactMatch(argument)) { // Immediate char
        return argument[1].charCodeAt(0); // TODO: Original (number)argument[1].toLatin1();
      } else if (this.isValidNBytesValue(argument, immediateNumBytes)) { // Immediate hex/dec value
        return this.stringToInt(argument);
      } else {
        throw new MachineError(MachineErrorCode.INVALID_VALUE);
      }
    } else {
      if (this.isValidAddress(argument)) { // Address
        return this.stringToInt(argument);
      } else {
        throw new MachineError(MachineErrorCode.INVALID_ADDRESS);
      }
    }
  }

  public stringToInt(valueString: string): number {
    if (valueString.toLowerCase().startsWith("h")) {
      return parseInt(valueString.slice(1), 16); // Remove H
    } else {
      return parseInt(valueString, 10);
    }
  }

  //#endregion

  //////////////////////////////////////////////////
  // Memory read/write with access count
  //////////////////////////////////////////////////

  //#region Memory read/write with access count

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
        return this.address(this.memoryRead(immediateAddress) + this.getRegisterValueByName("X"));

      case AddressingModeCode.INDEXED_BY_PC:
        return this.address(this.memoryRead(immediateAddress) + this.getRegisterValueByName("PC"));

      default:
        return 0;
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

  //#endregion

  //////////////////////////////////////////////////
  // Import/Export memory
  //////////////////////////////////////////////////

  //#region Import/Export memory

  // Returns true if successful
  public importMemory(_filename: string): FileErrorCode {
    throw Error("Not implemented");
    /*
      const byte: string;
      QFile this.memFile(filename); // Implicitly closed

      // Open file
      memFile.open(QFile.ReadOnly);

      if (memFile.size() !== 1 + this.identifier.length + this.memory.size() * 2)
          return FileErrorCode.INCORRECT_SIZE;

      // Read identifier length
      memFile.getChar(&byte);
      if (byte !== this.identifier.length)
          return FileErrorCode.INVALID_IDENTIFIER; // Incorrect identifier length

      // Read identifier
      for (let i = 0; i < this.identifier.length; i++)
      {
          memFile.getChar(&byte);

          if (byte !== this.identifier[i].toLatin1())
              return FileErrorCode.INVALID_IDENTIFIER; // Wrong character
      }

      // Read memory
      for (let address = 0; address < this.memory.size(); address++)
      {
          memFile.getChar(&byte);
          this.setMemoryValue(address, byte);
          memFile.getChar(&byte); // Skip byte
      }

      // Return error status
      if (memFile.error() !== QFileDevice.NoError)
          return FileErrorCode.INPUT_OUTPUT;
      else
          return FileErrorCode.NO_ERROR;
    */
  }

  // Returns true if successful
  public exportMemory(_filename: string): FileErrorCode {
    throw Error("Not implemented");
    /*
      QFile this.memFile(filename); // Implicitly closed

      // Open file
      memFile.open(QFile.WriteOnly);

      // Write identifier length
      memFile.putChar((unsigned char)this.identifier.length);

      // Write identifier
      for (let i = 0; i < this.identifier.length; i++)
      {
          memFile.putChar(this.identifier[i].toLatin1());
      }

      // Write memory bytes
      for (const byte of this.memory)
      {
          memFile.putChar(byte.getValue());
          memFile.putChar(0);
      }

      // Return error status
      if (memFile.error() !== QFileDevice.NoError)
          return FileErrorCode.INPUT_OUTPUT;
      else
          return FileErrorCode.NO_ERROR;
    */
  }

  //#endregion

  //////////////////////////////////////////////////
  // Instruction strings
  //////////////////////////////////////////////////

  //#region Instruction strings

  public updateInstructionStrings(): void {
    let address = 0, pendingArgumentBytes = 0; let pcReached = false;

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

  // TODO: Fix Pericles
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
      argument = addressingModePattern.replace("(.*)", argument).toUpperCase(); // Surround argument string with the corresponding addressing mode syntax
    }

    const argumentsSize = instruction.getNumBytes() - 1;
    return { argument, argumentsSize };
  }

  //#endregion

  //////////////////////////////////////////////////
  // High-level accessors
  //////////////////////////////////////////////////

  // Used to highlight the next operand
  public getNextOperandAddress(): { intermediateAddress: number, intermediateAddress2: number, finalOperandAddress: number } {
    const fetchedValue = this.getMemoryValue(this.getPCValue());
    const instruction = this.getInstructionFromValue(fetchedValue);
    const addressingModeCode: AddressingModeCode = this.extractAddressingModeCode(fetchedValue);

    let intermediateAddress = -1;
    const intermediateAddress2 = -1;
    let finalOperandAddress = -1;

    if (!instruction || instruction.getNumBytes() !== 2) {
      return { intermediateAddress, intermediateAddress2, finalOperandAddress };
    }

    const immediateAddress = this.address(this.getPCValue() + 1);

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
        finalOperandAddress = this.address(this.getMemoryValue(immediateAddress) + this.getRegisterValueByName("X"));
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        finalOperandAddress = this.address(this.getMemoryValue(immediateAddress) + this.getRegisterValueByName("PC"));
        break;
    }

    return { intermediateAddress, intermediateAddress2, finalOperandAddress };
  }

}
