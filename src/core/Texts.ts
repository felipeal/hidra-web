import { AssemblerErrorCode, ErrorMessage } from "./Errors";
import { AddressingModeCode } from "./AddressingMode";
import { Machine } from "./Machine";
import { FlagCode } from "./Flag";

interface AddressingModeDescription { acronym: string, name: string, format: string, description: string }
interface DirectiveDescription { name: string, description: string, examples: string }

export class Texts {

  public static getDirectiveDescription(directive: string): DirectiveDescription {
    switch (directive) {
      case "org": return {
        name: "Origin",
        description: "Posiciona a montagem das instruções subsequentes no endereço 'a' da memória.",
        examples: "Exemplo: ORG 128"
      };
      case "db": return {
        name: "Define Byte",
        description: "Reserva um byte na posição de montagem atual, opcionalmente inicializando-o com um valor 'a'.",
        examples: "Exemplos: DB | DB 255 | DB -128 | DB hFF | DB 'z'"
      };
      case "dw": return {
        name: "Define Word",
        description: "Reserva uma palavra (2 bytes) na posição de montagem atual. Os 8 bits mais significativos são armazenados no primeiro byte (big-endian), exceto na máquina Pericles (little-endian).",
        examples: "Exemplos: DW | DW 65535 | DW hFFFF | DW 'z'"
      };
      case "dab": return {
        name: "Define Array of Bytes",
        description: "Reserva uma sequência de um ou mais bytes, com suporte a strings. Um número 'a' entre colchetes permite reservar 'a' valores sem inicializá-los.",
        examples: "Exemplos: DAB 1, 2 | DAB 1 2 | DAB 'abc' | DAB [20]"
      };
      case "daw": return {
        name: "Define Array of Words",
        description: "Reserva uma sequência de uma ou mais palavras (valores de 2 bytes), com suporte a strings. Os 8 bits mais significativos são armazenados no primeiro byte (big-endian), exceto na máquina Pericles (little-endian).",
        examples: "Exemplos: DAW 1, 2 | DAW 1 2 | DAW 'abc' | DAW [20]"
      };
      case "dab/daw": return {
        name: "Define Array of Bytes/Words",
        description: "Reserva uma sequência de um ou mais bytes (DAB) ou palavras (DAW), separados por espaços ou vírgulas, com suporte a strings. No caso de palavras (2 bytes), os 8 bits mais significativos são armazenados primeiro (big-endian), exceto na máquina Pericles (little-endian).",
        examples: "Exemplos: DAB 1, 2 | DAW 1 2 | DAB 'abc' | DAW [20]"
      };
      default: throw new Error(`Unknown directive: ${directive}`);
    }
  }

  public static getInstructionDescription(assemblyFormat: string, machine: Machine): [name: string, description: string] {
    if (machine.getName() === "Volta") {
      return Texts.getVoltaDescription(assemblyFormat);
    }

    switch (assemblyFormat) {
      // Neander
      case "nop": return ["No Operation", "Nenhuma operação."];
      case "sta a": return ["Store Accumulator", "Armazena o valor do acumulador no endereço 'a'."];
      case "lda a": return ["Load Accumulator", "Carrega o valor no endereço 'a' para o acumulador."];
      case "add a": return ["Add", "Adiciona o valor no endereço 'a' ao acumulador."];
      case "or a": return ["Or", "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no acumulador."];
      case "and a": return ["And", "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no acumulador."];
      case "not": return ["Not", "Inverte (complementa para 1) o valor dos bits do acumulador."];
      case "jmp a": return ["Jump", "Desvia a execução para o endereço 'a' (desvio incondicional)."];
      case "jn a": return ["Jump if Negative", "Se a flag N estiver ativada (acumulador negativo), desvia a execução para o endereço 'a'."];
      case "jz a": return ["Jump if Zero", "Se a flag Z estiver ativada (acumulador zerado), desvia a execução para o endereço 'a'."];
      case "hlt": return ["Halt", "Termina a execução."];

      // Ahmes
      case "sub a": return ["Subtract", "Subtrai o valor no endereço 'a' do acumulador."];
      case "jp a": return ["Jump if Positive/Zero", "Se a flag N estiver desativada (acumulador positivo ou zero), desvia a execução para o endereço 'a'."];
      case "jv a": return ["Jump if Overflow", "Se a flag V (overflow) estiver ativada, desvia a execução para o endereço 'a'."];
      case "jnv a": return ["Jump if Not Overflow", "Se a flag V (overflow) estiver desativada, desvia a execução para o endereço 'a'."];
      case "jnz a": return ["Jump if Not Zero", "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'."];
      case "jc a": return ["Jump if Carry", "Se a flag C (carry) estiver ativada, desvia a execução para o endereço 'a'."];
      case "jnc a": return ["Jump if Not Carry", "Se a flag C (carry) estiver desativada, desvia a execução para o endereço 'a'."];

      case "jb a": return ["Jump if Borrow", (machine.hasFlag(FlagCode.BORROW) ?
        "Se a flag B estiver ativada (borrow), desvia a execução para o endereço 'a'." :
        "Se a flag C estiver desativada (borrow), desvia a execução para o endereço 'a'.")
      ];

      case "jnb a": return ["Jump if Not Borrow", "Se a flag B estiver desativada (not borrow), desvia a execução para o endereço 'a'."];
      case "shr": return ["Shift Right", "Realiza shift lógico dos bits do acumulador para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0."];
      case "shl": return ["Shift Left", "Realiza shift lógico dos bits do acumulador para a esquerda, passando o estado do bit mais significativo para a flag C (carry) e preenchendo o bit menos significativo com 0."];
      case "ror": return ["Rotate Right", "Realiza rotação para a esquerda dos bits do acumulador, incluindo a flag C (carry) como um bit."];
      case "rol": return ["Rotate Left", "Realiza rotação para a direita dos bits do acumulador, incluindo a flag C (carry) como um bit."];

      // Ramses
      case "str r a": return ["Store Register", "Armazena o valor do registrador 'r' no endereço 'a'."];
      case "ldr r a": return ["Load Register", "Carrega o valor no endereço 'a' para o registrador 'r'."];
      case "add r a": return ["Add", "Adiciona o valor no endereço 'a' ao registrador 'r'."];
      case "or r a": return ["Or", "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'."];
      case "and r a": return ["And", "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'."];
      case "not r": return ["Not", "Inverte (complementa para 1) o valor dos bits do registrador 'r'."];
      case "sub r a": return ["Subtract", "Subtrai o valor no endereço 'a' do registrador 'r'."];
      case "jsr a": return ["Jump to Subroutine", "Desvio para sub-rotina: armazena o endereço de retorno (instrução seguinte) em 'a' e desvia a execução para o endereço 'a' + 1."];
      case "neg r": return ["Negate", "Troca o sinal do valor em complemento de 2 do registrador 'r' entre positivo e negativo."];
      case "shr r": return ["Shift Right", "Realiza shift lógico dos bits do registrador 'r' para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0."];

      // Cromag
      case "str a": return Texts.getInstructionDescription("sta a", machine);
      case "ldr a": return Texts.getInstructionDescription("lda a", machine);

      // Pitagoras
      case "jd a": return ["Jump if Different from Zero", "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'."];

      // REG
      case "inc r": return ["Increment", "Incrementa o registrador 'r' em uma unidade."];
      case "dec r": return ["Decrement", "Decrementa o registrador 'r' de uma unidade."];
      case "if r a0 a1": return ["If Zero", "Se o registrador 'r' for igual a zero, desvia a execução para o endereço 'a0'. Se for diferente de zero, desvia para 'a1'."];

      default: throw new Error(`Missing description for assembly format: ${assemblyFormat}`);
    }
  }

  public static shortenArguments(text: string): string {
    return (text.includes("a0") && text.includes("a1")) ? text.replace("a0", "a").replace("a1", "b") : text;
  }

  private static getVoltaDescription(assemblyFormat: string): [string, string] {
    switch (assemblyFormat) {
      case "nop": return ["No Operation", "Nenhuma operação."];

      // Arithmetic and logic (two operands)
      case "add": return ["Add", "Desempilha A e B, empilha B + A."];
      case "sub": return ["Subtract", "Desempilha A e B, empilha B - A."];
      case "and": return ["And", "Desempilha A e B, empilha resultado do 'e' lógico entre seus bits."];
      case "or": return ["Or", "Desempilha A e B, empilha resultado do 'ou' lógico entre seus bits."];

      // Arithmetic and logic (one operand)
      case "clr": return ["Clear", "Zera o valor no topo da pilha."];
      case "not": return ["Not", "Inverte (complementa para 1) o valor dos bits do topo da pilha."];
      case "neg": return ["Negate", "Troca o sinal do valor em complemento de 2 do topo da pilha entre positivo e negativo."];
      case "inc": return ["Increment", "Incrementa em uma unidade o topo da pilha."];
      case "dec": return ["Decrement", "Decrementa de uma unidade o topo da pilha."];
      case "asr": return ["Arithmetical Shift Right", "Realiza shift aritmético dos bits do topo da pilha para a direita, mantendo seu sinal em complemento de dois (bit mais significativo)."];
      case "asl": return ["Arithmetical Shift Left", "Realiza shift aritmético dos bits do topo da pilha para a esquerda, preenchendo com zero o bit menos significativo."];
      case "ror": return ["Rotate Right", "Realiza rotação para a direita dos bits do topo da pilha."];
      case "rol": return ["Rotate Left", "Realiza rotação para a esquerda dos bits do topo da pilha."];

      // Conditionals (one operand)
      case "sz": return ["Skip if Zero", "Retira o topo da pilha e pula a próxima instrução se for igual a zero."];
      case "snz": return ["Skip if Not Zero", "Retira o topo da pilha e pula a próxima instrução se for diferente de zero."];
      case "spl": return ["Skip if Plus", "Retira o topo da pilha e pula a próxima instrução se for positivo."];
      case "smi": return ["Skip if Minus", "Retira o topo da pilha e pula a próxima instrução se for negativo."];
      case "spz": return ["Skip if Plus/Zero", "Retira o topo da pilha e pula a próxima instrução se for maior ou igual a zero."];
      case "smz": return ["Skip if Minus/Zero", "Retira o topo da pilha e pula a próxima instrução se for menor ou igual a zero."];

      // Conditionals (two operands)
      case "seq": return ["Skip if Equal", "Retira A e B da pilha e pula a próxima instrução se B = A."];
      case "sne": return ["Skip if Not Equal", "Retira A e B da pilha e pula a próxima instrução se B ≠ A."];
      case "sgr": return ["Skip if Greater Than", "Retira A e B da pilha e pula a próxima instrução se B &gt; A."];
      case "sls": return ["Skip if Less Than", "Retira A e B da pilha e pula a próxima instrução se B &lt; A."];
      case "sge": return ["Skip if Greater Than / Equal To", "Retira A e B da pilha e pula a próxima instrução se B ≥ A."];
      case "sle": return ["Skip if Less Than / Equal To", "Retira A e B da pilha e pula a próxima instrução se B ≤ A."];

      // Others
      case "rts": return ["Return from Subroutine", "Retorno de sub-rotina: desvia para o endereço indicado pelo topo da pilha, desempilhando-o."];
      case "psh a": return ["Push", "Empilha o valor do endereço de memória 'a'."];
      case "pop a": return ["Pop", "Desempilha o topo da pilha, armazenando-o no endereço de memória 'a'."];
      case "jmp a": return ["Jump", "Desvia a execução para o endereço 'a' (desvio incondicional)."];
      case "jsr a": return ["Jump to Subroutine", "Desvio para sub-rotina: empilha endereço de retorno (instrução seguinte) e desvia para o endereço 'a'."];
      case "hlt": return ["Halt", "Termina a execução."];

      default: throw new Error(`Missing description for assembly format: ${assemblyFormat}`);
    }
  }

  public static getAddressingModeDescription(addressingModeCode: AddressingModeCode): AddressingModeDescription {
    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT: return {
        acronym: "DIR",
        name: "Direto",
        format: "Formato: a",
        description: "Valor de 'a' representa o endereço do operando, ou endereço de desvio em operações de jump."
      };

      case AddressingModeCode.INDIRECT: return {
        acronym: "IND",
        name: "Indireto",
        format: "Formato: a,I (sufixo ,I)",
        description: "Valor de 'a' representa o endereço que contém o endereço direto."
      };

      case AddressingModeCode.IMMEDIATE: return {
        acronym: "IMD",
        name: "Imediato",
        format: "Formato: #a (prefixo #)",
        description: "Valor de 'a' representa não um endereço, mas um valor imediato a ser carregado ou utilizado em operações aritméticas/lógicas."
      };

      case AddressingModeCode.INDEXED_BY_X: return {
        acronym: "IDX",
        name: "Indexado por X",
        format: "Formato: a,X (sufixo ,X)",
        description: "Endereçamento direto com deslocamento (offset). A soma dos valores de 'a' e do registrador X representa o endereço direto."
      };

      case AddressingModeCode.INDEXED_BY_PC: return {
        acronym: "IPC",
        name: "Indexado por PC",
        format: "Formato: a,PC (sufixo ,PC)",
        description: "Endereçamento direto com deslocamento (offset). A soma dos valores de 'a' e do registrador PC representa o endereço direto."
      };
    }
  }

  public static buildErrorMessageText(errorMessage: ErrorMessage): string {
    return `Linha ${errorMessage.lineNumber}: ${Texts.getErrorCodeMessage(errorMessage.errorCode)}`;
  }

  private static getErrorCodeMessage(errorCode: AssemblerErrorCode): string {
    switch (errorCode) {
      case AssemblerErrorCode.TOO_FEW_ARGUMENTS: return "Número de argumentos menor do que o esperado.";
      case AssemblerErrorCode.TOO_MANY_ARGUMENTS: return "Número de argumentos maior do que o esperado.";
      case AssemblerErrorCode.INVALID_MNEMONIC: return "Mnemônico inválido.";
      case AssemblerErrorCode.INVALID_ADDRESS: return "Endereço inválido.";
      case AssemblerErrorCode.INVALID_VALUE: return "Valor inválido.";
      case AssemblerErrorCode.INVALID_STRING: return "String inválido.";
      case AssemblerErrorCode.INVALID_CHARACTER: return "Caractere inválido.";
      case AssemblerErrorCode.INVALID_LABEL: return "Label inválido.";
      case AssemblerErrorCode.RESERVED_KEYWORD: return "Label inválido: palavra reservada para esta máquina.";
      case AssemblerErrorCode.RESERVED_HEX_SYNTAX: return "Label inválido: sintaxe reservada para hexadecimais.";
      case AssemblerErrorCode.INVALID_ARGUMENT: return "Argumento inválido.";
      case AssemblerErrorCode.INVALID_SEPARATOR: return "Separador de argumentos inválido.";
      case AssemblerErrorCode.DUPLICATE_LABEL: return "Label já definido.";
      case AssemblerErrorCode.LABEL_NOT_ALLOWED: return "Uso de labels não permitido para este mnemônico.";
      case AssemblerErrorCode.MEMORY_OVERLAP: return "Sobreposição de memória.";
      case AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED: return "Limite de memória excedido.";
    }
  }

}
