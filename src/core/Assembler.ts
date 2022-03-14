import { MachineError, MachineErrorCode } from "./Errors";
import { Register } from "./Register";
import { Instruction } from "./Instruction";
import { AddressingModeCode } from "./AddressingMode";
import { EventCallback, QRegExp } from "./Utils";
import { Texts } from "./Texts";
import { Byte } from "./Byte";
import { Machine } from "./Machine";

export class Assembler {

  private readonly machine: Machine;
  private readonly pc: Register;
  private buildSuccessful = false;
  private firstErrorLine = -1;

  private assemblerMemory: Byte[] = [];
  private reserved: boolean[];
  private addressCorrespondingSourceLine: number[];
  private sourceLineCorrespondingAddress: number[] = [];
  private addressCorrespondingLabel: string[];
  private labelPCMap: Map<string, number> = new Map();

  private eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(machine: Machine) {
    this.machine = machine;
    this.pc = new Register("PC", "", machine.getPCNumberOfBits(), false);

    // Initialize memory arrays
    new Array(machine.getMemorySize()).fill(null).forEach(() => this.assemblerMemory.push(new Byte()));
    this.reserved = new Array(machine.getMemorySize()).fill(false);
    this.addressCorrespondingSourceLine = new Array(machine.getMemorySize()).fill(-1);
    this.addressCorrespondingLabel = new Array(machine.getMemorySize()).fill("");
  }

  //////////////////////////////////////////////////
  // Assembler
  //////////////////////////////////////////////////

  // Returns an array of error messages on failure
  public assemble(sourceCode: string): string[] {
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

          const instruction = this.machine.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            let numBytes = instruction.getNumBytes();

            if (numBytes === 0) { // If instruction has variable number of bytes
              const addressArgument = sourceLines[lineNumber].split(whitespace).slice(-1).join(" "); // Last argument
              const { addressingModeCode } = this.extractArgumentAddressingModeCode(addressArgument);
              numBytes = this.machine.calculateInstructionNumBytes(instruction, addressingModeCode);
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
          errorMessages.push(Texts.buildErrorMessage(lineNumber, error.errorCode));
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

          const instruction: Instruction | null = this.machine.getInstructionFromMnemonic(mnemonic);
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
          errorMessages.push(Texts.buildErrorMessage(lineNumber, error.errorCode));
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

    this.machine.clearAfterBuild();

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
          if (bytesPerArgument === 2 && this.machine.isLittleEndian()) {
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
      registerBitCode = this.machine.getRegisterBitCode(argumentList[0]);

      if (registerBitCode === Register.NO_BIT_CODE) {
        throw new MachineError(MachineErrorCode.INVALID_ARGUMENT); // Register not found (or invisible)
      }
    }

    // If argumentList contains an address/value:
    if (instructionArguments.includes("a")) {
      const { argument: newArgument, addressingModeCode } = this.extractArgumentAddressingModeCode(argumentList[argumentList.length - 1]); // Removes addressing mode from argument
      argumentList[argumentList.length - 1] = newArgument; // TODO: Refactor
      addressingModeBitCode = this.machine.getAddressingModeBitCode(addressingModeCode);
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

  // Increments PC
  public setAssemblerMemoryNext(value: number): void {
    this.assemblerMemory[this.getPCValue()].setValue(value);
    this.incrementPCValue();
  }

  // Copies assemblerMemory to machine's memory
  public copyAssemblerMemoryToMemory(): void {
    for (let i = 0; i < this.machine.getMemorySize(); i++) {
      // Copy only different values to avoid marking bytes as changed
      if (this.machine.getMemoryValue(i) !== this.assemblerMemory[i].getValue()) {
        this.machine.setMemoryValue(i, this.assemblerMemory[i].getValue());
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
    return this.isValidValue(addressString, -this.machine.getMemorySize(), this.machine.getMemorySize() - 1);
  }

  public isValidOrg(offsetString: string): boolean {
    return this.isValidValue(offsetString, 0, this.machine.getMemorySize() - 1);
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
    let addressingModeCode = this.machine.getDefaultAddressingModeCode();

    for (const addressingMode of this.machine.getAddressingModes()) {
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

  // TODO: Move to conversions?
  public stringToInt(valueString: string): number {
    if (valueString.toLowerCase().startsWith("h")) {
      return parseInt(valueString.slice(1), 16); // Remove H
    } else {
      return parseInt(valueString, 10);
    }
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  // TODO: Currently unused
  public clear(): void {
    this.clearAssemblerData();
  }

  public getBuildSuccessful(): boolean {
    return this.buildSuccessful;
  }

  public getFirstErrorLine(): number {
    return this.firstErrorLine;
  }

  public getPCCorrespondingSourceLine(): number {
    return (this.addressCorrespondingSourceLine.at(this.pc.getValue()) ?? -1);
  }

  public getAddressCorrespondingSourceLine(address: number): number {
    return (this.buildSuccessful) ? (this.addressCorrespondingSourceLine[address] ?? -1) : -1;
  }

  public getSourceLineCorrespondingAddress(line: number): number {
    return (this.buildSuccessful) ? (this.sourceLineCorrespondingAddress[line] ?? -1) : -1;
  }

  public getAddressCorrespondingLabel(address: number): string {
    return (this.buildSuccessful) ? this.addressCorrespondingLabel[address] : "";
  }

  public clearAssemblerData(): void {
    for (let i = 0; i < this.assemblerMemory.length; i++) {
      this.assemblerMemory[i].setValue(0);
      this.reserved[i] = false;
      this.addressCorrespondingSourceLine[i] = -1;
      this.setAddressCorrespondingLabel(i, "");
    }

    this.sourceLineCorrespondingAddress = [];
    this.labelPCMap.clear();
  }

  protected setAddressCorrespondingLabel(address: number, label: string): void {
    this.addressCorrespondingLabel[address] = label;
    this.publishEvent(`LABEL.${address}`, label);
  }

  public getPCValue(): number {
    return this.pc.getValue();
  }

  public setPCValue(value: number): void {
    this.pc.setValue(value);
  }

  public incrementPCValue(units = 1): void {
    this.setPCValue(this.pc.getValue() + units);
  }

  //////////////////////////////////////////////////
  // Listeners
  //////////////////////////////////////////////////

  public subscribeToEvent(event: string, callback: EventCallback) {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] ?? [];
    this.eventSubscriptions[event].push(callback);
  }

  protected publishEvent(event: string, newValue: unknown, oldValue?: unknown) {
    this.eventSubscriptions[event]?.forEach(callback => callback(newValue, oldValue));
  }

}
