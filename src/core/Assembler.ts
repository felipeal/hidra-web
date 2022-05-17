import { AssemblerError, AssemblerErrorCode, ErrorMessage } from "./AssemblerError";
import { Register } from "./Register";
import { Instruction } from "./Instruction";
import { AddressingModeCode } from "./AddressingMode";
import { buildArray, range, assert, rethrowUnless } from "./utils/FunctionUtils";
import { EventCallback, UnsubscribeCallback } from "./utils/EventUtils";
import { RegExpMatcher } from "./utils/RegExpMatcher";
import { Byte } from "./Byte";
import { Machine } from "./Machine";
import { codeStringToNumber } from "./utils/Conversions";

export class Assembler {

  // Patterns
  public static readonly WHITESPACE = /\s+/;
  public static readonly LABEL_PATTERN = "[a-z_][a-z0-9_]*";
  public static readonly STRING_PATTERN = /^'('|([^']|''')+)'([,\s]+|$|(?=;))/m; // '(1=string)'(3=separator)
  public static readonly VALUE_PATTERN = /^([^'\s,]+)([,\s]+|$|(?=;))/m; // (1=value)(2=separator)
  public static readonly ARGUMENTS_SEPARATOR = /\s*,\s*|\s+/; // Accepts commas, only used in directives by default

  public static readonly DIRECTIVES = ["org", "db", "dw", "dab", "daw"];

  protected readonly machine: Machine;
  protected reserved: boolean[];
  protected buildSuccessful = false;
  protected firstErrorLine = -1;

  protected pcValue = 0;
  protected assemblerMemory: Byte[] = [];
  protected addressCorrespondingSourceLine: number[];
  protected sourceLineCorrespondingAddress: number[] = [];
  protected addressCorrespondingLabel: string[];
  protected labelPCMap: Map<string, number> = new Map();
  protected reservedKeywords: Set<string>;
  protected eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(machine: Machine) {
    this.machine = machine;

    // Initialize memory arrays
    this.assemblerMemory = buildArray(machine.getMemorySize(), () => new Byte());
    this.reserved = new Array(machine.getMemorySize()).fill(false);
    this.addressCorrespondingSourceLine = new Array(machine.getMemorySize()).fill(-1);
    this.addressCorrespondingLabel = new Array(machine.getMemorySize()).fill("");

    this.reservedKeywords = new Set(this.buildReservedKeywordsList());
  }

  //////////////////////////////////////////////////
  // Assembler
  //////////////////////////////////////////////////

  // Returns an array of error messages on failure
  public build(sourceCode: string): ErrorMessage[] {
    this.buildSuccessful = false;
    this.firstErrorLine = -1;

    const errorMessages: ErrorMessage[] = [];

    const labelMatcher = new RegExpMatcher(/^(\w+):/); // Also captures invalid labels to inform errors
    const firstTokenMatcher = new RegExpMatcher(/^(\S+)\s*/);

    //////////////////////////////////////////////////
    // Simplify source code
    //////////////////////////////////////////////////

    const sourceLines = sourceCode.split(/\r?\n/); // Split source code to individual lines

    // Strip comments and trim whitespace
    for (const lineIndex of range(sourceLines.length)) {
      sourceLines[lineIndex] = this.removeComment(sourceLines[lineIndex]);
      sourceLines[lineIndex] = sourceLines[lineIndex].trim();
    }

    //////////////////////////////////////////////////
    // FIRST PASS: Read labels, reserve memory
    //////////////////////////////////////////////////

    this.clearAssemblerData();
    this.setPCValue(0);

    for (const lineIndex of range(sourceLines.length)) {
      try {

        //////////////////////////////////////////////////
        // Read labels
        //////////////////////////////////////////////////

        // If line starts with a label pattern
        if (labelMatcher.match(sourceLines[lineIndex])) {
          const labelName = labelMatcher.cap(1);

          // Check for invalid label name
          if (!this.isValidLabelFormat(labelName)) {
            throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL);
          } else if (this.isReservedKeyword(labelName)) {
            throw new AssemblerError(AssemblerErrorCode.RESERVED_KEYWORD);
          } else if (this.isReservedHexSyntax(labelName)) {
            throw new AssemblerError(AssemblerErrorCode.RESERVED_HEX_SYNTAX);
          }

          // Check for duplicate label
          if (this.labelPCMap.has(labelName.toLowerCase())) {
            throw new AssemblerError(AssemblerErrorCode.DUPLICATE_LABEL);
          }

          this.labelPCMap.set(labelName.toLowerCase(), this.getPCValue()); // Add to map
          this.setAddressCorrespondingLabel(this.getPCValue(), labelName);
          sourceLines[lineIndex] = sourceLines[lineIndex].slice(labelMatcher.cap(0).length).trim(); // Consume label
        }

        //////////////////////////////////////////////////
        // Reserve memory for instructions/directives
        //////////////////////////////////////////////////

        if (firstTokenMatcher.match(sourceLines[lineIndex])) {
          const mnemonic = firstTokenMatcher.cap(1).toLowerCase();
          const args = sourceLines[lineIndex].slice(firstTokenMatcher.cap(0).length); // Everything after mnemonic

          const instruction = this.machine.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            const numBytes = this.calculateNumBytes(instruction, args);
            this.reserveAssemblerMemory(numBytes, lineIndex);
          } else if (Assembler.DIRECTIVES.includes(mnemonic)) {
            this.obeyDirective(mnemonic, args, true, lineIndex);
          } else {
            throw new AssemblerError(AssemblerErrorCode.INVALID_MNEMONIC);
          }
        }

      } catch (error: unknown) {
        rethrowUnless(error instanceof AssemblerError, error);
        if (this.firstErrorLine === -1) {
          this.firstErrorLine = lineIndex;
        }
        errorMessages.push({ lineNumber: lineIndex + 1, errorCode: error.errorCode });
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

    for (const lineIndex of range(sourceLines.length)) {
      try {
        if (firstTokenMatcher.match(sourceLines[lineIndex])) {
          this.sourceLineCorrespondingAddress[lineIndex] = this.getPCValue();

          const mnemonic = firstTokenMatcher.cap(1).toLowerCase();
          const args = sourceLines[lineIndex].slice(firstTokenMatcher.cap(0).length); // Everything after mnemonic

          const instruction: Instruction | null = this.machine.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            this.buildInstruction(instruction, args);
          } else {
            this.obeyDirective(mnemonic, args, false, lineIndex);
          }
        }
      } catch (error: unknown) {
        rethrowUnless(error instanceof AssemblerError, error);
        if (this.firstErrorLine === -1) {
          this.firstErrorLine = lineIndex;
        }
        errorMessages.push({ lineNumber: lineIndex + 1, errorCode: error.errorCode });
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

  protected calculateNumBytes(instruction: Instruction, args: string): number {
    // Fixed number of bytes
    if (instruction.getNumBytes() > 0) {
      return instruction.getNumBytes();

    // Variable number of bytes and 1 argument
    } else if (instruction.hasParameter("a")) {
      const argumentList = this.splitInstructionArguments(args);
      const argument = this.extractArgument(argumentList, instruction, "a");
      const { addressingModeCode } = this.extractArgumentAddressingModeCode(argument);
      return this.machine.calculateInstructionNumBytes(instruction, addressingModeCode);
    }

    assert(false, "Unexpected parameter format for instruction with variable number of bytes: " + instruction.getAssemblyFormat());
  }

  // TODO: Check if other places could break because of the array access
  // Extracts argument that corresponds to a given parameter. Throws AssemblerError if missing.
  protected extractArgument(argumentList: string[], instruction: Instruction, parameter: string): string {
    const argument = argumentList[instruction.getParameterPos(parameter)];
    if (!argument) {
      throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    }
    return argument;
  }

  protected removeComment(line: string): string {
    const stringMatcher = new RegExpMatcher(Assembler.STRING_PATTERN);
    const codeMatcher = new RegExpMatcher(/^[^;']+/); // Neither string nor comment

    let result = "";

    while (line) {
      if (line.startsWith(";")) {
        break;
      } else if (codeMatcher.match(line)) {
        result += codeMatcher.cap(0);
        line = line.slice(codeMatcher.cap(0).length);
      } else if (stringMatcher.match(line)) {
        result += stringMatcher.cap(0);
        line = line.slice(stringMatcher.cap(0).length);
      } else {
        result += line; // Unclosed string, abort
        break;
      }
    }

    return result;
  }

  protected obeyDirective(mnemonic: string, args: string, reserveOnly: boolean, sourceLine: number): void {
    assert(Assembler.DIRECTIVES.includes(mnemonic), `Unexpected argument for obeyDirective: ${mnemonic}`);

    if (mnemonic === "org") {
      const argumentList = this.splitOrgArguments(args);
      const numberOfArguments = argumentList.length;

      if (numberOfArguments < 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
      } else if (numberOfArguments > 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS);
      } else if (!this.isValidOrg(argumentList[0])) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ADDRESS);
      }

      this.setPCValue(codeStringToNumber(argumentList[0]));
    } else {
      const { argumentList, isAllocate } = this.normalizeDirectiveArguments(args);

      const bytesPerArgument = (mnemonic === "db" || mnemonic === "dab") ? 1 : 2;
      const isDefineArray = (mnemonic === "dab" || mnemonic === "daw");
      const allowLabels = (mnemonic === "db" || mnemonic === "dw"); // Daedalus only allows labels for DB/DW

      if (!isDefineArray && argumentList.length === 0) {
        argumentList.push("0"); // Default to argument 0 in case of DB and DW
      }

      // Validate number of arguments
      if (!isDefineArray && argumentList.length > 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS); // TODO: Error specific to strings too?
      } else if (isDefineArray && argumentList.length < 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
      }

      // Memory allocation
      if (isAllocate) {
        if (mnemonic !== "dab" && mnemonic !== "daw") {
          throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
        } else if (reserveOnly) {
          this.reserveAssemblerMemory(Number(argumentList[0]) * bytesPerArgument, sourceLine);
        } else { // Skip already reserved bytes
          this.incrementPCValue(Number(argumentList[0]) * bytesPerArgument);
        }
      } else if (reserveOnly) {
        this.reserveAssemblerMemory(argumentList.length * bytesPerArgument, sourceLine); // Increments PC
      } else {
        // Process each argument
        for (const argument of argumentList) {
          const value = this.argumentToValue(argument, { isImmediate: true, defineNumBytes: bytesPerArgument, allowLabels });

          // Write value
          if (bytesPerArgument === 2) {
            this.setAssemblerMemoryNextWord(value);
          } else {
            this.setAssemblerMemoryNext(value & 0xFF);
          }
        }
      }
    }
  }

  protected buildInstruction(instruction: Instruction, args: string): void {
    const argumentList = this.splitInstructionArguments(args);

    let isImmediate = false;
    let registerBitCode = 0b00000000;
    let addressingModeBitCode = 0b00000000;

    // Check if number of arguments is correct
    if (argumentList.length < instruction.getNumberOfParameters()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    } else if (argumentList.length > instruction.getNumberOfParameters()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS);
    }

    // If argumentList contains a register
    if (instruction.hasParameter("r")) {
      registerBitCode = this.registerNameToBitCode(argumentList[instruction.getParameterPos("r")]);
    }

    // If argumentList contains an address/value
    if (instruction.hasParameter("a")) {
      const { argument: extractedArgument, addressingModeCode } = this.extractArgumentAddressingModeCode(argumentList[instruction.getParameterPos("a")]);
      argumentList[instruction.getParameterPos("a")] = extractedArgument;
      addressingModeBitCode = this.machine.getAddressingModeBitCode(addressingModeCode);
      isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE);
    }

    // Write first byte (instruction with register and addressing mode)
    this.setAssemblerMemoryNext(instruction.getByteValue() | registerBitCode | addressingModeBitCode);

    // Write second byte (if 1-byte address/immediate value)
    if (instruction.getNumBytes() === 2 || isImmediate) {
      const value = this.argumentToValue(argumentList[instruction.getParameterPos("a")], { isImmediate });
      this.setAssemblerMemoryNext(value);

    // Write second and third bytes (if 2-byte addresses)
    } else if (instruction.hasParameter("a")) {
      const address = this.argumentToValue(argumentList[instruction.getParameterPos("a")], { isImmediate });
      this.setAssemblerMemoryNextWord(address);

    // If instruction has two addresses (REG_IF), write both addresses
    } else if (instruction.hasParameter("a0") && instruction.hasParameter("a1")) {
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instruction.getParameterPos("a0")], { isImmediate }));
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instruction.getParameterPos("a1")], { isImmediate }));
    }
  }

  protected registerNameToBitCode(registerName: string): number {
    const registerBitCode = this.machine.getRegisterBitCode(registerName);
    if (registerBitCode === Register.NO_BIT_CODE) {
      throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT); // TODO: Register not found
    }
    return registerBitCode;
  }

  // Increments PC
  protected setAssemblerMemoryNextWord(value: number): void {
    if (this.machine.isLittleEndian()) {
      this.setAssemblerMemoryNext(value & 0xFF); // Least significant byte first
      this.setAssemblerMemoryNext((value >> 8) & 0xFF);
    } else {
      this.setAssemblerMemoryNext((value >> 8) & 0xFF); // Most significant byte first
      this.setAssemblerMemoryNext(value & 0xFF);
    }
  }

  // Increments PC
  protected setAssemblerMemoryNext(value: number): void {
    this.assemblerMemory[this.getPCValue()].setValue(value);
    this.incrementPCValue();
  }

  // Copies assemblerMemory to machine's memory
  protected copyAssemblerMemoryToMemory(): void {
    for (const i of range(this.machine.getMemorySize())) {
      // Copy only different values to avoid triggering events
      if (this.machine.getMemoryValue(i) !== this.assemblerMemory[i].getValue()) {
        this.machine.setMemoryValue(i, this.assemblerMemory[i].getValue());
      }
    }
  }

  // Reserves 'sizeToReserve' bytes starting from PC, associates addresses with a source line. Throws exception on overlap.
  protected reserveAssemblerMemory(sizeToReserve: number, associatedSourceLine: number): void {
    while (sizeToReserve > 0) {
      if (!this.reserved[this.getPCValue()]) {
        this.reserved[this.getPCValue()] = true;
        this.addressCorrespondingSourceLine[this.getPCValue()] = associatedSourceLine;
        this.incrementPCValue();
        sizeToReserve--;
      } else {
        throw new AssemblerError(AssemblerErrorCode.MEMORY_OVERLAP); // Memory already reserved
      }
    }
  }

  // Validates label names (must start with a letter/underline, may have numbers)
  protected isValidLabelFormat(labelName: string): boolean {
    const labelMatcher = new RegExpMatcher(Assembler.LABEL_PATTERN);
    return labelMatcher.fullMatch(labelName.toLowerCase());
  }

  protected buildReservedKeywordsList(): string[] {
    const reservedKeywords: string[] = [];

    // Directives
    reservedKeywords.push(...Assembler.DIRECTIVES);

    // Instruction mnemonics
    reservedKeywords.push(...this.machine.getInstructions().map(i => i.getMnemonic().toLowerCase()));

    // Register names (if usable in code)
    const usableRegisters = this.machine.getRegisters().filter(r => r.getBitCode() !== Register.NO_BIT_CODE).map(r => r.getName().toLowerCase());
    if (usableRegisters.length > 1) {
      reservedKeywords.push(...usableRegisters);
    }

    // Addressing modes (uppercase letter sequences only)
    reservedKeywords.push(...this.machine.getAddressingModes().map(a => a.getAssemblyPattern().replace(/[^A-Z]/g, "").toLowerCase()).filter(a => a));

    return reservedKeywords;
  }

  protected isReservedKeyword(labelName: string): boolean {
    return this.reservedKeywords.has(labelName.toLowerCase());
  }

  protected isReservedHexSyntax(labelName: string): boolean {
    return /^h[0-9a-f]*$/.test(labelName.toLowerCase());
  }

  // Returns true if conversion ok and value between min and max (closed interval)
  protected isValidValue(valueString: string, min: number, max: number): boolean {
    return this.isValidValueFormat(valueString) && this.isValueInRange(valueString, min, max);
  }

  protected isValidValueFormat(valueString: string): boolean {
    valueString = valueString.toLowerCase();

    if (valueString.startsWith("h")) {
      return /^h[0-9a-f]{1,6}$/.test(valueString);
    } else {
      return /^-?\d{1,6}$/.test(valueString);
    }
  }

  // Does not validate valueString. Both min and max are considered in range (closed interval)
  protected isValueInRange(valueString: string, min: number, max: number): boolean {
    const value = codeStringToNumber(valueString);
    return (value >= min && value <= max);
  }

  // Checks if string is a valid number for the machine
  protected isValidNBytesValue(valueString: string, n: number): boolean {
    if (n === 1) {
      return this.isValidValue(valueString, -128, 255);
    } else {
      assert(n === 2, `Invalid number of bytes: ${n}`);
      return this.isValidValue(valueString, -32768, 65535);
    }
  }

  protected isValidAddress(addressString: string): boolean {
    // Allows negative values to refer to memory end. Note: Daedalus does not have lower/upper bounds.
    return this.isValidValue(addressString, -this.machine.getMemorySize(), this.machine.getMemorySize() - 1);
  }

  protected isValidOrg(offsetString: string): boolean {
    return this.isValidValue(offsetString, 0, this.machine.getMemorySize() - 1);
  }

  // Does not allow commas by default, since it conflicts with addressing modes for 8-bit machines
  protected splitInstructionArguments(args: string): string[] {
    const trimmedArguments = args.trim();
    return (trimmedArguments === "") ? [] : trimmedArguments.split(Assembler.WHITESPACE);
  }

  protected splitOrgArguments(args: string): string[] {
    const trimmedArguments = args.trim();
    return (trimmedArguments === "") ? [] : trimmedArguments.split(Assembler.ARGUMENTS_SEPARATOR);
  }

  // TODO: Change args to argumentsString, argumentList to argumentsList, finalArgumentList to finalArgumentsList

  // TODO: Instead of isAllocate special handling, return an array of zeroes

  protected normalizeDirectiveArguments(args: string): { argumentList: string[], isAllocate: boolean } {
    let finalArgumentList: string[] = [];

    // Regular expressions
    const allocateMatcher = new RegExpMatcher(/\[(\d+)\]/); // Digits between brackets
    const valueMatcher = new RegExpMatcher(Assembler.VALUE_PATTERN); // (1=value)(2=separator)
    const stringMatcher = new RegExpMatcher(Assembler.STRING_PATTERN); // '(1=string)'(3=separator)

    args = args.trim(); // Trim whitespace

    //////////////////////////////////////////////////
    // Byte/Word allocation
    //////////////////////////////////////////////////

    if (allocateMatcher.fullMatch(args)) {
      return { argumentList: [allocateMatcher.cap(1)], isAllocate: true };
    }

    //////////////////////////////////////////////////
    // String/Value arguments
    //////////////////////////////////////////////////

    while (args.length > 0) {
      if (valueMatcher.match(args)) {
        this.validateSeparator(valueMatcher.cap(2));
        finalArgumentList.push(valueMatcher.cap(1));
        args = args.slice(valueMatcher.cap(0).length);
      } else if (stringMatcher.match(args)) {
        this.validateSeparator(stringMatcher.cap(3));
        const stringContent = stringMatcher.cap(1);
        const parsedStringContent = stringContent.replaceAll("'''", "'"); // Replace escaped single quotes
        const charList = parsedStringContent.split("").map(c => `'${c}'`);
        finalArgumentList = finalArgumentList.concat(charList);
        args = args.slice(stringMatcher.cap(0).length);
      } else if (args.startsWith("'")) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_STRING);
      } else {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }
    }

    return { argumentList: finalArgumentList, isAllocate: false };
  }

  protected validateSeparator(separator: string): void {
    // Forbids multiple commas between arguments. Note: Allowed in Daedalus.
    if (separator.split(",").length > 2) {
      throw new AssemblerError(AssemblerErrorCode.INVALID_SEPARATOR);
    }
  }

  protected extractArgumentAddressingModeCode(argument: string): { argument: string, addressingModeCode: AddressingModeCode } {
    for (const addressingMode of this.machine.getAddressingModes()) {
      const extractedValue = addressingMode.extractMatchingValue(argument);

      if (extractedValue) {
        return {
          argument: extractedValue,
          addressingModeCode: addressingMode.getAddressingModeCode()
        };
      }
    }

    return { argument, addressingModeCode: this.machine.getDefaultAddressingModeCode() };
  }

  // TODO: Value may be negative, review all usages
  protected argumentToValue(argument: string, { isImmediate, defineNumBytes, allowLabels = true, allowLabelOffset = true }: {
    isImmediate: boolean, defineNumBytes?: number, allowLabels?: boolean, allowLabelOffset?: boolean, relativeLabels?: boolean
  }): number {
    const charMatcher = new RegExpMatcher("'(.)'");
    const immediateNumBytes = defineNumBytes ?? this.machine.getImmediateNumBytes();

    // Extract offset from argument
    const [offset, argumentWithoutOffset] = this.extractOffsetFromArgument(argument, allowLabelOffset);
    argument = argumentWithoutOffset;

    // Convert label to number string
    if (this.labelPCMap.has(argument.toLowerCase())) {
      if (!allowLabels) {
        throw new AssemblerError(AssemblerErrorCode.LABEL_NOT_ALLOWED);
      }

      argument = String(this.labelPCMap.get(argument.toLowerCase())! + offset);
    }

    if (isImmediate) {
      if (charMatcher.fullMatch(argument)) { // Immediate char
        return this.charToInteger(charMatcher.cap(1));
      } else if (this.isValidNBytesValue(argument, immediateNumBytes)) { // Immediate hex/dec value
        return codeStringToNumber(argument);
      } else if (this.isValidValueFormat(argument)) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_VALUE);
      } else {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }
    } else {
      if (this.isValidAddress(argument)) {
        return codeStringToNumber(argument);
      } else if (this.isValidValueFormat(argument)) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ADDRESS);
      } else if (this.isValidLabelFormat(argument) && argument.length > 1) { // Assume label unless single character
        throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL);
      } else {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }
    }
  }

  protected extractOffsetFromArgument(argument: string, allowLabelOffset: boolean): [offset: number, argumentWithoutOffset: string] {
    const offsetMatcher = new RegExpMatcher(`(${Assembler.LABEL_PATTERN})(\\+|-)(\\w+)`); // (label)(+|-)(offset)

    if (offsetMatcher.fullMatch(argument.toLowerCase())) {
      if (!allowLabelOffset) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT); // TODO: More specific
      } else if (!this.isValidValueFormat(offsetMatcher.cap(3))) { // Validate offset format
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }

      const sign = (offsetMatcher.cap(2) === "+") ? 1 : -1;
      const offset = sign * codeStringToNumber(offsetMatcher.cap(3));
      const argumentWithoutOffset = offsetMatcher.cap(1); // Label only
      return [offset, argumentWithoutOffset];
    } else {
      return [0, argument];
    }
  }

  private charToInteger(char: string): number {
    const charCode = char.charCodeAt(0);

    // Restricted to ASCII to maximize compatibility
    if (charCode >= 32 && charCode <= 126 && char.length === 1) {
      return charCode;
    } else {
      throw new AssemblerError(AssemblerErrorCode.INVALID_CHARACTER);
    }
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  public getBuildSuccessful(): boolean {
    return this.buildSuccessful;
  }

  public getFirstErrorLine(): number {
    return this.firstErrorLine;
  }

  public getPCCorrespondingSourceLine(): number {
    return (this.addressCorrespondingSourceLine[this.machine.getPCValue()] ?? -1);
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

  protected clearAssemblerData(): void {
    for (const i of range(this.assemblerMemory.length)) {
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

  protected getPCValue(): number {
    if (this.pcValue >= this.machine.getMemorySize() || this.pcValue < 0) {
      throw new AssemblerError(AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED);
    }
    return this.pcValue;
  }

  protected setPCValue(value: number): void {
    this.pcValue = value; // Overflow is allowed until this new value is used (getPCValue).
  }

  protected incrementPCValue(units = 1): void {
    this.pcValue += units;
  }

  //////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////

  public subscribeToEvent(event: string, callback: EventCallback): UnsubscribeCallback {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] ?? [];
    this.eventSubscriptions[event].push(callback);
    return () => this.eventSubscriptions[event] = this.eventSubscriptions[event].filter((f) => f !== callback);
  }

  protected publishEvent(event: string, value: unknown): void {
    this.eventSubscriptions[event]?.forEach(callback => callback(value));
  }

}
