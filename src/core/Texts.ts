import { AssemblerErrorCode } from "./Errors";
import { AddressingModeCode } from "./AddressingMode";
import { Machine } from "./Machine";
import { FlagCode } from "./Flag";

interface AddressingModeDescription { acronym: string, name: string, format: string, description: string }
interface DirectiveDescription { name: string,  description: string, examples: string }

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

  public static getInstructionDescription(assemblyFormat: string, machine: Machine): string {
    if (machine.getName() === "Volta") {
      return Texts.getVoltaDescription(assemblyFormat);
    }

    switch (assemblyFormat) {
      // Neander
      case "nop": return "Nenhuma operação.";
      case "sta a": return "Armazena o valor do acumulador no endereço 'a'.";
      case "lda a": return "Carrega o valor no endereço 'a' para o acumulador.";
      case "add a": return "Adiciona o valor no endereço 'a' ao acumulador.";
      case "or a": return "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no acumulador.";
      case "and a": return "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no acumulador.";
      case "not": return "Inverte (complementa) o valor dos bits do acumulador.";
      case "jmp a": return "Desvia a execução para o endereço 'a' (desvio incondicional).";
      case "jn a": return "Se a flag N estiver ativada (acumulador negativo), desvia a execução para o endereço 'a'.";
      case "jz a": return "Se a flag Z estiver ativada (acumulador zerado), desvia a execução para o endereço 'a'.";
      case "hlt": return "Termina a execução.";

      // Ahmes
      case "sub a": return "Subtrai o valor no endereço 'a' do acumulador.";
      case "jp a": return "Se a flag N estiver desativada (acumulador positivo ou zero), desvia a execução para o endereço 'a'.";
      case "jv a": return "Se a flag V estiver ativada (overflow), desvia a execução para o endereço 'a'.";
      case "jnv a": return "Se a flag V estiver desativada (not overflow), desvia a execução para o endereço 'a'.";
      case "jnz a": return "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'.";
      case "jc a": return "Se a flag C estiver ativada (carry), desvia a execução para o endereço 'a'.";
      case "jnc a": return "Se a flag C estiver desativada (not carry), desvia a execução para o endereço 'a'.";

      case "jb a": return (machine.hasFlag(FlagCode.BORROW) ?
        "Se a flag B estiver ativada (borrow), desvia a execução para o endereço 'a'." :
        "Se a flag C estiver desativada (borrow), desvia a execução para o endereço 'a'.");

      case "jnb a": return "Se a flag B estiver desativada (not borrow), desvia a execução para o endereço 'a'.";
      case "shr": return "Realiza shift lógico dos bits do acumulador para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0.";
      case "shl": return "Realiza shift lógico dos bits do acumulador para a esquerda, passando o estado do bit mais significativo para a flag C (carry) e preenchendo o bit menos significativo com 0.";
      case "ror": return "Realiza rotação para a esquerda dos bits do acumulador, incluindo a flag C (carry) como um bit.";
      case "rol": return "Realiza rotação para a direita dos bits do acumulador, incluindo a flag C (carry) como um bit.";

      // Ramses
      case "str r a": return "Armazena o valor do registrador 'r' no endereço 'a'.";
      case "ldr r a": return "Carrega o valor no endereço 'a' para o registrador 'r'.";
      case "add r a": return "Adiciona o valor no endereço 'a' ao registrador 'r'.";
      case "or r a": return "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'.";
      case "and r a": return "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no registrador 'r'.";
      case "not r": return "Inverte (complementa) o valor dos bits do registrador 'r'.";
      case "sub r a": return "Subtrai o valor no endereço 'a' do registrador 'r'.";
      case "jsr a": return "Desvia para subrotina, armazenando o valor atual de PC em 'a' e desviando a execução para o endereço 'a' + 1.";
      case "neg r": return "Troca o sinal do valor em complemento de 2 do registrador 'r' entre positivo e negativo.";
      case "shr r": return "Realiza shift lógico dos bits do registrador 'r' para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0.";

      // Pitagoras
      case "jd a": return "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'.";

      // REG
      case "inc r": return "Incrementa o registrador 'r' em uma unidade.";
      case "dec r": return "Decrementa o registrador 'r' de uma unidade.";
      case "if r a0 a1": return "Se o registrador 'r' for igual a zero (if zero), desvia a execução para o endereço 'a0'. Se for diferente de zero, desvia para 'a1'.";

      default: return "";
    }
  }

  public static shortenArguments(text: string): string {
    return (text.includes("a0") && text.includes("a1")) ? text.replace("a0", "a").replace("a1", "b") : text;
  }

  private static getVoltaDescription(assemblyFormat: string): string {
    switch (assemblyFormat) {
      case "nop": return "Nenhuma operação.";

      // Arithmetic and logic (two operands)
      case "add": return "Desempilha A e B, empilha B + A.";
      case "sub": return "Desempilha A e B, empilha B - A.";
      case "and": return "Desempilha A e B, empilha resultado do 'e' lógico entre seus bits.";
      case "or": return "Desempilha A e B, empilha resultado do 'ou' lógico entre seus bits.";

      // Arithmetic and logic (one operand)
      case "clr": return "Zera o valor no topo da pilha.";
      case "not": return "Inverte (complementa) o valor dos bits do topo da pilha.";
      case "neg": return "Troca o sinal do valor em complemento de 2 do topo da pilha entre positivo e negativo.";
      case "inc": return "Incrementa em uma unidade o topo da pilha.";
      case "dec": return "Decrementa de uma unidade o topo da pilha.";
      case "asr": return "Realiza shift aritmético dos bits do topo da pilha para a direita, mantendo seu sinal em complemento de dois (bit mais significativo).";
      case "asl": return "Realiza shift aritmético dos bits do topo da pilha para a esquerda, preenchendo com zero o bit menos significativo.";
      case "ror": return "Realiza rotação para a direita dos bits do topo da pilha.";
      case "rol": return "Realiza rotação para a esquerda dos bits do topo da pilha.";

      // Conditionals (one operand)
      case "sz": return "Retira o topo da pilha e pula a próxima instrução se for igual a zero (skip on zero).";
      case "snz": return "Retira o topo da pilha e pula a próxima instrução se for diferente de zero (skip on not zero).";
      case "spl": return "Retira o topo da pilha e pula a próxima instrução se for positivo (skip on plus).";
      case "smi": return "Retira o topo da pilha e pula a próxima instrução se for negativo (skip on minus).";
      case "spz": return "Retira o topo da pilha e pula a próxima instrução se for maior ou igual a zero (skip on plus/zero).";
      case "smz": return "Retira o topo da pilha e pula a próxima instrução se for menor ou igual a zero (skip on minus/zero).";

      // Conditionals (two operands)
      case "seq": return "Retira A e B da pilha e pula a próxima instrução se B = A (skip if equal).";
      case "sne": return "Retira A e B da pilha e pula a próxima instrução se B ≠ A (skip if not equal).";
      case "sgr": return "Retira A e B da pilha e pula a próxima instrução se B &gt; A (skip if greater than).";
      case "sls": return "Retira A e B da pilha e pula a próxima instrução se B &lt; A (skip if less than).";
      case "sge": return "Retira A e B da pilha e pula a próxima instrução se B ≥ A (skip if greater than/equal to).";
      case "sle": return "Retira A e B da pilha e pula a próxima instrução se B ≤ A (skip if less than/equal to).";

      // Others
      case "rts": return "Desvia para o endereço indicado pelo topo da pilha, desempilhando-o (retorno de sub-rotina).";
      case "psh a": return "Empilha o valor do endereço de memória 'a'.";
      case "pop a": return "Desempilha o topo da pilha, armazenando-o no endereço de memória 'a'.";
      case "jmp a": return "Desvia a execução para o endereço 'a' (desvio incondicional).";
      case "jsr a": return "Empilha PC e desvia para o endereço 'a' (desvio para sub-rotina).";
      case "hlt": return "Termina a execução.";

      default: return "";
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

  public static buildErrorMessage(lineIndex: number, errorCode: AssemblerErrorCode) {
    return `Linha ${String(lineIndex + 1)}: ${Texts.getErrorCodeMessage(errorCode)}`;
  }

  private static getErrorCodeMessage(errorCode: AssemblerErrorCode): string {
    switch (errorCode) {
      case AssemblerErrorCode.TOO_FEW_ARGUMENTS: return "Número de argumentos menor do que o esperado.";
      case AssemblerErrorCode.TOO_MANY_ARGUMENTS: return "Número de argumentos maior do que o esperado.";
      case AssemblerErrorCode.INVALID_INSTRUCTION: return "Mnemônico inválido.";
      case AssemblerErrorCode.INVALID_ADDRESS: return "Endereço inválido.";
      case AssemblerErrorCode.INVALID_VALUE: return "Valor inválido.";
      case AssemblerErrorCode.INVALID_STRING: return "String inválido.";
      case AssemblerErrorCode.INVALID_LABEL: return "Label inválido.";
      case AssemblerErrorCode.INVALID_ARGUMENT: return "Argumento inválido.";
      case AssemblerErrorCode.DUPLICATE_LABEL: return "Label já definido.";
      case AssemblerErrorCode.MEMORY_OVERLAP: return "Sobreposição de memória.";
      case AssemblerErrorCode.NOT_IMPLEMENTED: return "Funcionalidade não implementada.";

      default: return "Erro indefinido.";
    }
  }

}
