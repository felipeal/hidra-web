import { Register } from "./Register";
import { Flag, FlagCode } from "./Flag";
import { Instruction } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { Byte } from "./Byte";
import { Conversion } from "./Conversion";
import { Q_ASSERT, validateSize } from "./Utils";

type EventCallback = ((newValue: unknown, oldValue?: unknown) => void);

interface MachineSettings {
  name: string,
  identifier: string,
  memorySize: number,
  flags: Flag[],
  registers: Register[],
  instructions: Instruction[],
  addressingModes: AddressingMode[],
  littleEndian?: boolean
}

export abstract class MachineState {

  // Constants
  static readonly ALLOCATE_SYMBOL = "%";
  static readonly QUOTE_SYMBOL = "¢";

  // TODO: Change remaining protected properties to private
  // TODO: Remove "!"

  // Machine setttings (always provided in constructor)
  protected name!: string;
  protected identifier!: string;
  private memorySize!: number;
  private flags!: Flag[];
  private registers!: Register[];
  private instructions!: Instruction[];
  private addressingModes!: AddressingMode[];
  protected littleEndian: boolean;

  private pc: Register;
  private memory: Byte[] = [];
  protected assemblerMemory: Byte[] = [];
  private instructionStrings: string[] = [];
  protected reserved: boolean[] = [];
  protected addressCorrespondingSourceLine: number[] = []; // Each address may be associated with a line of code
  protected sourceLineCorrespondingAddress: number[] = []; // Each address may be associated with a line of code
  private addressCorrespondingLabel: string[] = [];
  private changed: boolean[] = [];
  protected labelPCMap: Map<string, number> = new Map();
  protected descriptions: Map<string, string> = new Map();
  protected buildSuccessful!: boolean;
  private running = false;
  protected firstErrorLine!: number;
  private breakpoint = -1;
  private instructionCount = 0;
  private accessCount = 0;
  private memoryMask!: number;
  private eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(settings: MachineSettings) {
    // Assign settings
    Object.assign(this, settings);
    this.setMemorySize(settings.memorySize);
    this.littleEndian = settings.littleEndian || false;

    this.pc = this.registers.find(register => register.getName() === "PC")!;
    Q_ASSERT(Boolean(this.pc), "Register PC not found.");
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  public getName(): string {
    return this.name;
  }

  public getIdentifier(): string {
    return this.identifier;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public setRunning(running: boolean): void {
    this.running = running;
  }

  public getBuildSuccessful(): boolean {
    return this.buildSuccessful;
  }

  public getFirstErrorLine(): number {
    return this.firstErrorLine;
  }

  public getBreakpoint(): number {
    return this.breakpoint;
  }

  public setBreakpoint(value: number): void {
    if (value >= this.memory.length || value < 0) {
      this.breakpoint = -1;
    } else {
      this.breakpoint = value;
    }
  }

  public getMemory(): ReadonlyArray<Byte> {
    return this.memory;
  }

  public getMemorySize(): number {
    return this.memorySize;
  }

  protected setMemorySize(size: number): void {
    validateSize(size);
    this.memorySize = size;

    new Array(size).fill(null).forEach(() => this.memory.push(new Byte()));
    new Array(size).fill(null).forEach(() => this.assemblerMemory.push(new Byte()));

    this.instructionStrings = new Array(size).fill("");
    this.reserved = new Array(size).fill(false);
    this.changed = new Array(size).fill(true);
    this.addressCorrespondingSourceLine = new Array(size).fill(-1);
    this.addressCorrespondingLabel = new Array(size).fill("");

    this.memoryMask = (size - 1);
  }

  public getMemoryValue(address: number): number {
    return this.memory[address & this.memoryMask].getValue();
  }

  public setMemoryValue(address: number, value: number): void {
    const validAddress = address & this.memoryMask;
    const validValue = value & 0xFF; // TODO: Review memoryMask vs addressMask (also in C++)

    this.memory[validAddress].setValue(validValue);
    this.changed[validAddress] = true;
    this.publishEvent(`MEM.${address}`, validValue);
  }

  // Has byte changed last look-up
  public hasByteChanged(address: number): boolean {
    if (this.changed[address & this.memoryMask]) {
      this.changed[address & this.memoryMask] = false;
      return true;
    } else {
      return false;
    }
  }

  public clearMemory(): void {
    for (let i = 0; i < this.memory.length; i++) {
      this.setMemoryValue(i, 0);
    }
  }

  public getInstructionString(address: number): string {
    return this.instructionStrings[address & this.memoryMask];
  }

  protected setInstructionString(address: number, value: string): void {
    this.instructionStrings[address & this.memoryMask] = value;
    this.publishEvent(`INS.${address}`, value);
  }

  public clearInstructionStrings(): void {
    for (let i = 0; i < this.instructionStrings.length; i++) {
      this.setInstructionString(i, "");
    }
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

  public getNumberOfFlags(): number {
    return this.flags.length;
  }

  public getFlags(): ReadonlyArray<Flag> {
    return this.flags;
  }

  public getFlagName(id: number): string {
    return this.flags[id].getName();
  }

  public getFlagValueById(id: number): boolean {
    return this.flags[id].getValue();
  }

  public getFlagValueByName(flagName: string): boolean {
    for (const flag of this.flags) {
      if (flag.getName() === flagName) {
        return flag.getValue();
      }
    }

    throw Error("Invalid flag name: ") + flagName;
  }

  public setFlagValueById(id: number, value: boolean): void {
    this.flags[id].setValue(value);
    this.publishEvent(`FLAG.${this.flags[id].getName()}`, value);
  }

  public setFlagValueByName(flagName: string, value: boolean): void {
    for (const flag of this.flags) {
      if (flag.getName() === flagName) {
        flag.setValue(value);
        this.publishEvent(`FLAG.${flag.getName()}`, value);
        return;
      }
    }

    throw Error("Invalid flag name: ") + flagName;
  }

  public setFlagValueByFlagCode(flagCode: FlagCode, value: boolean): void {
    for (const flag of this.flags) {
      if (flag.getFlagCode() === flagCode) {
        flag.setValue(value);
        this.publishEvent(`FLAG.${flag.getName()}`, value);
      }
    }
  }

  public clearFlags(): void {
    for (const flag of this.flags) {
      flag.resetValue();
      this.publishEvent(`FLAG.${flag.getName()}`, flag.getValue());
    }
  }

  public hasFlag(flagCode: FlagCode): boolean { // TODO: Use get by flag code
    for (const flag of this.flags) {
      if (flag.getFlagCode() === flagCode) {
        return true;
      }
    }

    return false;
  }

  public getNumberOfRegisters(): number {
    return this.registers.length;
  }

  public getRegisters(): ReadonlyArray<Register> {
    return this.registers;
  }

  // -1 if no code
  public getRegisterBitCode(registerName: string): number {
    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return register.getBitCode();
      }
    }

    return Register.NO_BIT_CODE; // Register not found
  }

  public getRegisterName(id: number): string {
    const name = this.registers[id].getName();

    if (name !== "") {
      return name;
    } else {
      return "R" + String(id); // Default to R0..R63
    }
  }

  public hasRegister(registerName: string): boolean {
    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  public getRegisterValueById(id: number, signedData = false): number {
    if (signedData && this.registers[id].isData()) {
      return this.registers[id].getSignedValue();
    } else {
      return this.registers[id].getValue();
    }
  }

  public getRegisterValueByName(registerName: string): number {
    if (registerName === "") { // Undefined register
      return 0;
    }

    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return register.getValue();
      }
    }

    throw Error("Invalid register name: ") + registerName;
  }

  public setRegisterValueById(id: number, value: number): void {
    const oldValue = this.registers[id].getValue();
    this.registers[id].setValue(value);
    this.publishEvent(`REG.${this.registers[id].getName()}`, value, oldValue);
  }

  public setRegisterValueByName(registerName: string, value: number): void {
    if (registerName === "") { // Undefined register
      return;
    }

    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        const oldValue = register.getValue();
        register.setValue(value);
        this.publishEvent(`REG.${registerName}`, value, oldValue);
        return;
      }
    }

    throw Error("Invalid register name: ") + registerName; // FIXME and similar
  }

  public isRegisterData(id: number): boolean {
    return this.registers[id].isData();
  }

  public clearRegisters(): void {
    for (const register of this.registers) {
      const oldValue = register.getValue();
      register.setValue(0);
      this.publishEvent(`REG.${register.getName()}`, 0, oldValue);
    }
  }

  public getPCName(): string {
    return this.pc.getName();
  }

  public getPCValue(): number {
    return this.pc.getValue();
  }

  public setPCValue(value: number): void {
    const oldValue = this.pc.getValue();
    this.pc.setValue(value);
    this.publishEvent(`REG.${this.pc.getName()}`, value, oldValue);
  }

  public incrementPCValue(units = 1): void {
    this.setPCValue(this.pc.getValue() + units);
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

  protected setAddressCorrespondingLabel(address: number, label: string): void {
    this.addressCorrespondingLabel[address] = label;
    this.publishEvent(`LABEL.${address}`, label);
  }

  public getInstructions(): ReadonlyArray<Instruction> {
    return this.instructions;
  }

  public getInstructionFromValue(value: number): Instruction | null {
    for (const instruction of this.instructions) {
      if (instruction.matchByte(value)) {
        return instruction;
      }
    }

    return null;
  }

  public getInstructionFromMnemonic(mnemonic: string): Instruction | null {
    for (const instruction of this.instructions) {
      if (instruction.getMnemonic() === mnemonic) {
        return instruction;
      }
    }

    return null;
  }

  public getAddressingModes(): ReadonlyArray<AddressingMode> {
    return this.addressingModes;
  }

  public getDefaultAddressingModeCode(): AddressingModeCode {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAssemblyPattern() === AddressingMode.NO_PATTERN) {
        return addressingMode.getAddressingModeCode();
      }
    }

    throw Error("Error defining default addressing mode.");
  }

  public getAddressingModeBitCode(addressingModeCode: AddressingModeCode): number {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAddressingModeCode() === addressingModeCode) {
        return Conversion.stringToValue(addressingMode.getBitPattern());
      }
    }

    throw Error("Invalid addressing mode code.");
  }

  public getAddressingModePattern(addressingModeCode: AddressingModeCode): string {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAddressingModeCode() === addressingModeCode) {
        return addressingMode.getAssemblyPattern();
      }
    }

    return ""; // TODO: Throw?
  }

  public getInstructionCount(): number {
    return this.instructionCount;
  }

  public incrementInstructionCount() {
    this.instructionCount++;
    this.publishEvent("INS.COUNT", this.instructionCount);
  }

  public getAccessCount(): number {
    return this.accessCount;
  }

  public incrementAccessCount() {
    this.accessCount++;
    this.publishEvent("ACC.COUNT", this.accessCount);
  }

  public clearCounters(): void {
    this.instructionCount = 0;
    this.accessCount = 0;
    this.publishEvent("INS.COUNT", this.instructionCount);
    this.publishEvent("ACC.COUNT", this.accessCount);
  }

  public clear(): void {
    this.clearMemory();
    this.clearRegisters();
    this.clearFlags();
    this.clearCounters();
    this.clearInstructionStrings();
    this.clearAssemblerData();

    this.setBreakpoint(-1);
    this.setRunning(false);
  }

  public clearAfterBuild(): void {
    this.clearRegisters();
    this.clearFlags();
    this.clearCounters();
    this.clearInstructionStrings();

    this.setRunning(false);
  }

  public generateDescriptions(): void {
    // Neander
    this.descriptions.set("nop", "Nenhuma operação.");
    this.descriptions.set("sta a", "Armazena o valor do acumulador no endereço 'a'.");
    this.descriptions.set("lda a", "Carrega o valor no endereço 'a' para o acumulador.");
    this.descriptions.set("add a", "Adiciona o valor no endereço 'a' ao acumulador.");
    this.descriptions.set("or a", "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no acumulador.");
    this.descriptions.set("and a", "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no acumulador.");
    this.descriptions.set("not", "Inverte (complementa) o valor dos bits do acumulador.");
    this.descriptions.set("jmp a", "Desvia a execução para o endereço 'a' (desvio incondicional).");
    this.descriptions.set("jn a", "Se a flag N estiver ativada (acumulador negativo), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jz a", "Se a flag Z estiver ativada (acumulador zerado), desvia a execução para o endereço 'a'.");
    this.descriptions.set("hlt", "Termina a execução.");

    // Ahmes
    this.descriptions.set("sub a", "Subtrai o valor no endereço 'a' do acumulador.");
    this.descriptions.set("jp a", "Se a flag N estiver desativada (acumulador positivo ou zero), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jv a", "Se a flag V estiver ativada (overflow), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jnv a", "Se a flag V estiver desativada (not overflow), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jnz a", "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jc a", "Se a flag C estiver ativada (carry), desvia a execução para o endereço 'a'.");
    this.descriptions.set("jnc a", "Se a flag C estiver desativada (not carry), desvia a execução para o endereço 'a'.");

    if (this.hasFlag(FlagCode.BORROW)) {
      this.descriptions.set("jb a", "Se a flag B estiver ativada (borrow), desvia a execução para o endereço 'a'.");
    } else {
      this.descriptions.set("jb a", "Se a flag C estiver desativada (borrow), desvia a execução para o endereço 'a'.");
    }

    this.descriptions.set("jnb a", "Se a flag B estiver desativada (not borrow), desvia a execução para o endereço 'a'.");
    this.descriptions.set("shr", "Realiza shift lógico dos bits do acumulador para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0.");
    this.descriptions.set("shl", "Realiza shift lógico dos bits do acumulador para a esquerda, passando o estado do bit mais significativo para a flag C (carry) e preenchendo o bit menos significativo com 0.");
    this.descriptions.set("ror", "Realiza rotação para a esquerda dos bits do acumulador, incluindo a flag C (carry) como um bit.");
    this.descriptions.set("rol", "Realiza rotação para a direita dos bits do acumulador, incluindo a flag C (carry) como um bit.");

    // Ramses
    this.descriptions.set("str r a", "Armazena o valor do registrador 'r' no endereço 'a'.");
    this.descriptions.set("ldr r a", "Carrega o valor no endereço 'a' para o registrador 'r'.");
    this.descriptions.set("add r a", "Adiciona o valor no endereço 'a' ao registrador 'r'.");
    this.descriptions.set("or r a", "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'.");
    this.descriptions.set("and r a", "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'.");
    this.descriptions.set("not r", "Inverte (complementa) o valor dos bits do registrador 'r'.");
    this.descriptions.set("sub r a", "Subtrai o valor no endereço 'a' do registrador 'r'.");
    this.descriptions.set("jsr a", "Desvia para subrotina, armazenando o valor atual de PC em 'a' e desviando a execução para o endereço 'a' + 1.");
    this.descriptions.set("neg r", "Troca o sinal do valor em complemento de 2 do registrador 'r' entre positivo e negativo.");
    this.descriptions.set("shr r", "Realiza shift lógico dos bits do registrador 'r' para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0.");

    // Pitagoras
    this.descriptions.set("jd a", "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'.");

    // REG
    this.descriptions.set("inc r", "Incrementa o registrador 'r' em uma unidade.");
    this.descriptions.set("dec r", "Decrementa o registrador 'r' de uma unidade.");
    this.descriptions.set("if r a0 a1", "Se o registrador 'r' for igual a zero (if zero), desvia a execução para o endereço 'a0'. Se for diferente de zero, desvia para 'a1'.");
  }

  public getDescription(assemblyFormat: string): string {
    // Initialize descriptions
    if (this.descriptions.size === 0) {
      this.generateDescriptions();
    }

    return this.descriptions.get(assemblyFormat) ?? "";
  }

  public getAddressingModeDescription(addressingModeCode: AddressingModeCode): { acronym: string, name: string, format: string, description: string } {
    let acronym: string, name: string, format: string, description: string;

    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT:
        acronym = "DIR";
        name = "Direto";
        format = "Formato: a";
        description = "Valor de 'a' representa o endereço do operando, ou endereço de desvio em operações de jump.";
        break;

      case AddressingModeCode.INDIRECT:
        acronym = "IND";
        name = "Indireto";
        format = "Formato: a,I (sufixo ,I)";
        description = "Valor de 'a' representa o endereço que contém o endereço direto.";
        break;

      case AddressingModeCode.IMMEDIATE:
        acronym = "IMD";
        name = "Imediato";
        format = "Formato: #a (prefixo #)";
        description = "Valor de 'a' representa não um endereço, mas um valor imediato a ser carregado ou utilizado em operações aritméticas/lógicas.";
        break;

      case AddressingModeCode.INDEXED_BY_X:
        acronym = "IDX";
        name = "Indexado por X";
        format = "Formato: a,X (sufixo ,X)";
        description = "Endereçamento direto com deslocamento (offset). A soma dos valores de ‘a’ e do registrador X representa o endereço direto.";
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        acronym = "IPC";
        name = "Indexado por PC";
        format = "Formato: a,PC (sufixo ,PC)";
        description = "Endereçamento direto com deslocamento (offset). A soma dos valores de ‘a’ e do registrador PC representa o endereço direto.";
        break;
    }

    return { acronym, name, format, description };
  }

  //////////////////////////////////////////////////
  // Listeners
  //////////////////////////////////////////////////

  public subscribeToEvent(event: string, callback: EventCallback) {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] || [];
    this.eventSubscriptions[event].push(callback);
  }

  protected publishEvent(event: string, newValue: unknown, oldValue?: unknown) {
    this.eventSubscriptions[event]?.forEach(callback => callback(newValue, oldValue));
  }

}
