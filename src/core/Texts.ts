/* eslint-disable max-len */

import { AssemblerErrorCode, ErrorMessage } from "./AssemblerError";
import { AddressingModeCode } from "./AddressingMode";
import { Machine } from "./Machine";
import { FlagCode } from "./Flag";
import { assert, assertUnreachable, multiline, notNull } from "./utils/FunctionUtils";
import { Volta } from "./machines/Volta";
import { Cesar } from "./machines/Cesar";

interface AddressingModeDescription { name: string, description: string, examples: string }
interface DirectiveDescription { name: string, description: string, examples: string }

export class Texts {

  public static getDirectiveDescription(directive: string, machine: Machine): DirectiveDescription {
    const bigEndianText = "Nesta máquina, os 8 bits mais significativos de uma palavra são armazenados no primeiro byte (big-endian).";
    const littleEndianText = "Nesta máquina, os 8 bits menos significativos de uma palavra são armazenados no primeiro byte (little-endian).";
    const endiannessText = (machine.isLittleEndian() ? littleEndianText : bigEndianText);

    switch (directive) {
      case "org": return {
        name: "Origin",
        description: "Posiciona a montagem das próximas instruções e diretivas no endereço de memória especificado.",
        examples: "Exemplo: ORG 128"
      };
      case "db": return {
        name: "Define Byte",
        description: multiline(
          "Reserva um byte na posição de montagem atual, opcionalmente inicializando-o com um valor.",
          "Suporta negativos (complemento de 2), hexadecimais e caracteres ASCII."
        ),
        examples: "Exemplos: DB | DB 255 | DB -128 | DB hFF | DB 'z'"
      };
      case "dw": return {
        name: "Define Word",
        description: multiline(
          "Reserva uma palavra (2 bytes) na posição de montagem atual, opcionalmente inicializando-a com um valor.",
          "Suporta negativos (complemento de 2), hexadecimais e caracteres ASCII.",
          endiannessText
        ),
        examples: "Exemplos: DW | DW 65535 | DW hFFFF | DW 'z'"
      };
      case "dab": return {
        name: "Define Array of Bytes",
        description: multiline(
          "Reserva uma sequência de um ou mais bytes, separados por espaços/vírgulas ou em formato de string.",
          "Um número N entre colchetes permite reservar N posições de memória, inicializadas em zero."
        ),
        examples: "Exemplos: DAB 1, 2 | DAB 1 2 | DAB 'abc' | DAB [20]"
      };
      case "daw": return {
        name: "Define Array of Words",
        description: multiline(
          "Reserva uma sequência de uma ou mais palavras (valores de 2 bytes), separados por espaços/vírgulas ou em formato de string.",
          endiannessText
        ),
        examples: "Exemplos: DAW 1, 2 | DAW 1 2 | DAW 'abc' | DAW [20]"
      };
      case "dab/daw": return {
        name: "Define Array of Bytes/Words",
        description: multiline(
          "Reserva uma sequência de um ou mais bytes (DAB) ou palavras de 2 bytes (DAW), separados por espaços/vírgulas ou em formato de string.",
          "Um número N entre colchetes permite reservar N bytes ou palavras de memória, inicializados em zero.",
          endiannessText
        ),
        examples: "Exemplos: DAB 1, 2 | DAW 1 2 | DAB 'abc' | DAW [20]"
      };
      default: assertUnreachable(`Unknown directive: ${directive}`);
    }
  }

  public static getInstructionDescription(assemblyFormat: string, machine: Machine | null): [name: string, description: string] {
    if (Volta.isVolta(machine)) {
      return Texts.getVoltaInstructionDescription(assemblyFormat);
    }

    if (Cesar.isCesar(machine)) {
      return Texts.getCesarInstructionDescription(assemblyFormat);
    }

    switch (assemblyFormat) {
      // Neander
      case "nop": return ["No Operation", "Nenhuma operação."];
      case "sta a": return ["Store Accumulator", "Armazena o valor do acumulador no endereço 'a'."];
      case "lda a": return ["Load Accumulator", "Carrega o valor no endereço 'a' para o acumulador."];
      case "add a": return ["Add", "Adiciona o valor no endereço 'a' ao acumulador."];
      case "or a": return ["Or", "Realiza um 'ou' lógico entre cada bit de 'a' e o bit correspondente no acumulador."];
      case "and a": return ["And", "Realiza um 'e' lógico entre cada bit de 'a' e o bit correspondente no acumulador."];
      case "not": return ["Not", "Inverte (complementa para 1) o valor de cada bit do acumulador."];
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

      case "jb a": return ["Jump if Borrow", (notNull(machine).hasFlag(FlagCode.BORROW) ?
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
      case "not r": return ["Not", "Inverte (complementa para 1) o valor de cada bit do registrador 'r'."];
      case "sub r a": return ["Subtract", "Subtrai o valor no endereço 'a' do registrador 'r'."];
      case "jsr a": return ["Jump to Subroutine", "Desvio para sub-rotina: armazena o endereço de retorno (instrução seguinte) em 'a' e desvia a execução para o endereço 'a' + 1."];
      case "neg r": return ["Negate", "Troca o sinal do valor em complemento de 2 do registrador 'r' entre positivo e negativo."];
      case "shr r": return ["Shift Right", "Realiza shift lógico dos bits do registrador 'r' para a direita, passando o estado do bit menos significativo para a flag C (carry) e preenchendo o bit mais significativo com 0."];

      // Cromag
      case "str a": return Texts.getInstructionDescription("sta a", machine); // Reuse description
      case "ldr a": return Texts.getInstructionDescription("lda a", machine); // Reuse description

      // Pitagoras
      case "jd a": return ["Jump if Different from Zero", "Se a flag Z estiver desativada (acumulador diferente de zero), desvia a execução para o endereço 'a'."];

      // REG
      case "inc r": return ["Increment", "Incrementa o registrador 'r' em uma unidade."];
      case "dec r": return ["Decrement", "Decrementa o registrador 'r' de uma unidade."];
      case "if r a0 a1": return ["If Zero", "Se o registrador 'r' for igual a zero, desvia a execução para o endereço 'a0'. Se for diferente de zero, desvia para 'a1'."];

      default: assertUnreachable(`Missing description for assembly format: ${assemblyFormat}`);
    }
  }

  public static shortenArguments(text: string): string {
    return (text.includes("a0") && text.includes("a1")) ? text.replaceAll("a0", "a").replaceAll("a1", "b") : text;
  }

  private static getVoltaInstructionDescription(assemblyFormat: string): [string, string] {
    switch (assemblyFormat) {
      case "nop": return Texts.getInstructionDescription(assemblyFormat, null); // Reuse description

      // Arithmetic and logic (two operands)
      case "add": return ["Add", "Desempilha A e B, empilha B + A."];
      case "sub": return ["Subtract", "Desempilha A e B, empilha B - A."];
      case "and": return ["And", "Desempilha A e B, empilha resultado do 'e' lógico entre seus bits."];
      case "or": return ["Or", "Desempilha A e B, empilha resultado do 'ou' lógico entre seus bits."];

      // Arithmetic and logic (one operand)
      case "clr": return ["Clear", "Zera o valor no topo da pilha."];
      case "not": return ["Not", "Inverte (complementa para 1) o valor de cada bit do topo da pilha."];
      case "neg": return ["Negate", "Troca o sinal do valor em complemento de 2 do topo da pilha entre positivo e negativo."];
      case "inc": return ["Increment", "Incrementa em uma unidade o topo da pilha."];
      case "dec": return ["Decrement", "Decrementa de uma unidade o topo da pilha."];
      case "asr": return ["Arithmetic Shift Right", "Realiza shift aritmético dos bits do topo da pilha para a direita, mantendo seu sinal em complemento de 2 (bit mais significativo)."];
      case "asl": return ["Arithmetic Shift Left", "Realiza shift aritmético dos bits do topo da pilha para a esquerda, preenchendo com zero o bit menos significativo."];
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
      case "hlt": return Texts.getInstructionDescription(assemblyFormat, null); // Reuse description

      default: assertUnreachable(`Missing description for assembly format: ${assemblyFormat}`);
    }
  }

  private static getCesarInstructionDescription(assemblyFormat: string): [string, string] {
    const branchExplanation = "O destino é um deslocamento (offset de -128 a 127) relativo ao registrador R7 (PC, que aponta para a instrução seguinte).";

    switch (assemblyFormat) {
      case "nop": return Texts.getInstructionDescription(assemblyFormat, null); // Reuse description

      // Condition codes
      case "ccc f": return ["Clear Condition Codes", multiline(
        "Desliga os códigos de condição (flags) selecionados.",
        "Exemplos: CCC NZVC | CCC N, C"
      )];
      case "scc f": return ["Set Condition Codes", multiline(
        "Liga os códigos de condição (flags) selecionados.",
        "Exemplos: SCC NZVC | SCC N, C"
      )];

      // Conditional branching: BR
      case "br o": return ["Branch", multiline(
        "Desvia a execução incondicionalmente.",
        branchExplanation,
        "Exemplos: BR 127 | BR -128 | BR Label | BR Label+4"
      )];

      // Conditional branching: BNE / BEQ
      case "bne o": return ["Branch if Not Equal", multiline(
        "Desvia a execução se Z = 0 (se CMP X, Y resulta em X ≠ Y).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BNE NotEqual"
      )];
      case "beq o": return ["Branch if Equal", multiline(
        "Desvia a execução se Z = 1 (se CMP X, Y resulta em X = Y).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BEQ Equal"
      )];

      // Conditional branching: BPL / BMI
      case "bpl o": return ["Branch if Plus", multiline(
        "Desvia a execução se N = 0 (resultado positivo ou zero em complemento de 2).",
        branchExplanation,
        "Exemplo: ADD R0, R1 / BPL PositiveOrZero"
      )];
      case "bmi o": return ["Branch if Minus", multiline(
        "Desvia a execução se N = 1 (resultado negativo em complemento de 2).",
        branchExplanation,
        "Exemplo: ADD R0, R1 / BMI Negative"
      )];

      // Conditional branching: BVC / BVS
      case "bvc o": return ["Branch if Overflow Clear", multiline(
        "Desvia a execução se V = 0 (última operação não causou overflow em complemento de 2).",
        branchExplanation,
        "Exemplo: ADD R0, R1 / BVC NoOverflow"
      )];
      case "bvs o": return ["Branch if Overflow Set", multiline(
        "Desvia a execução se V = 1 (última operação causou overflow em complemento de 2).",
        branchExplanation,
        "Exemplo: ADD R0, R1 / BVS Overflow"
      )];

      // Conditional branching: BCC / BCS
      case "bcc o": return ["Branch if Carry Clear", multiline(
        "Desvia a execução se C = 0 (última operação não resultou em carry ou borrow, considerando operandos sem-sinal).",
        branchExplanation,
        "Exemplos: ADD R0, R1 / BCC NoCarry | SUB R0, R1 / BCC NoBorrow"
      )];
      case "bcs o": return ["Branch if Carry Set", multiline(
        "Desvia a execução se C = 1 (última operação resultou em carry ou borrow, considerando operandos sem-sinal).",
        branchExplanation,
        "Exemplo: ADD R0, R1 / BCS Carry | SUB R0, R1 / BCS Borrow"
      )];

      // Conditional branching: BGT / BLT / BGE / BLE
      case "bgt o": return ["Branch if Greater Than", multiline(
        "Desvia a execução se N = V e Z = 0 (se CMP X, Y resulta em X > Y em complemento de 2).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BGT GreaterThan"
      )];
      case "blt o": return ["Branch if Less Than", multiline(
        "Desvia a execução se N ≠ V (se CMP X, Y resulta em X < Y em complemento de 2).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BLT LessThan"
      )];
      case "bge o": return ["Branch if Greater or Equal", multiline(
        "Desvia a execução se N = V (se CMP X, Y resulta em X ≥ Y em complemento de 2).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BGE GreaterOrEqual"
      )];
      case "ble o": return ["Branch if Less or Equal", multiline(
        "Desvia a execução se N ≠ V ou Z = 1 (se CMP X, Y resulta em X ≤ Y em complemento de 2).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BLE LessOrEqual"
      )];

      // Conditional branching: BHI / BLS
      case "bhi o": return ["Branch if Higher", multiline(
        "Desvia a execução se C = 0 e Z = 0 (se CMP X, Y resulta em X > Y considerando operandos sem-sinal).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BHI UnsignedHigher"
      )];
      case "bls o": return ["Branch if Lower or Same", multiline(
        "Desvia a execução se C = 1 ou Z = 1 (se CMP X, Y resulta em X ≤ Y considerando operandos sem-sinal).",
        branchExplanation,
        "Exemplo: CMP R0, R1 / BLS UnsignedLowerOrSame"
      )];

      // Flow control
      case "jmp a": return ["Jump", "Desvia a execução para o endereço de 'a'."];
      case "sob r o": return ["Subtract One and Branch", multiline(
        "Instrução para controle de laço. Subtrai 1 do registrador 'r', desviando sempre que 'r' ≠ 0.",
        "O destino é relativo ao registrador R7 (PC, que aponta para a instrução seguinte), subtraindo o valor do deslocamento (offset a subtrair, de -128 a 127).",
        "Exemplo: LoopUntilZero: DEC R0 / SOB R0, LoopUntilZero"
      )];
      case "jsr r a": return ["Jump to Subroutine", multiline("Desvio para sub-rotina:",
        "• Empilha o valor de 'r' (pilha indicada por R6);",
        "• Armazena o endereço de retorno (instrução seguinte) em 'r';",
        "• Desvia a execução para o endereço de 'a'."
      )];
      case "rts r": return ["Return from Subroutine", multiline("Retorno de sub-rotina:",
        "• Desvia para o endereço indicado por 'r';",
        "• Desempilha um valor, armazenando-o em 'r' (pilha indicada por R6)."
      )];

      // Arithmetic (one operand)
      case "clr a": return ["Clear", "Armazena o valor 0 no local do operando 'a'."];
      case "not a": return ["Not", "Inverte (complementa para 1) o valor de cada bit do operando 'a'."];
      case "inc a": return ["Increment", multiline(
        "Incrementa em 1 o valor do operando 'a'.",
        "C = Carry (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "dec a": return ["Decrement", multiline(
        "Decrementa em 1 o valor do operando 'a'.",
        "C = Borrow (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "neg a": return ["Negate", multiline(
        "Troca o sinal do valor em complemento de 2 do operando entre positivo e negativo.",
        "C = Borrow (ao subtrair o operando sem-sinal do valor zero);",
        "V = Overflow (em complemento de 2)."
      )];
      case "tst a": return ["Test", "Testa N e Z sem armazenar o resultado."];
      case "ror a": return ["Rotate Right", "Realiza rotação para a direita dos bits do operando, incluindo a flag C (carry) como um bit."];
      case "rol a": return ["Rotate Left", "Realiza rotação para a esquerda dos bits do operando, incluindo a flag C (carry) como um bit."];
      case "asr a": return ["Arithmetic Shift Right", multiline(
        "Realiza shift aritmético dos bits do operando para a direita, mantendo seu sinal em complemento de 2 (bit mais significativo).",
        "Semelhante a uma divisão por 2, porém o arredondamento é em direção ao infinito negativo.",
        "C = LSB (bit menos significativo) do operando."
      )];
      case "asl a": return ["Arithmetic Shift Left", multiline(
        "Realiza shift aritmético dos bits do operando para a esquerda, preenchendo com zero o bit menos significativo.",
        "Equivale a uma multiplicação por 2.",
        "C = MSB (bit mais significativo) do operando;",
        "V = Overflow (considerando multiplicação por 2 em complemento de 2)."
      )];
      case "adc a": return ["Add Carry", multiline(
        "Adiciona o valor da flag C (1 ou 0) ao operando.",
        "C = Carry (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "sbc a": return ["Subtract Carry", multiline(
        "Subtrai o valor da flag C (1 ou 0) do operando.",
        "C = Not-Borrow (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];

      // Arithmetic (two operands)
      case "mov a0 a1": return ["Move", "Copia o valor de a0 (origem) para a1 (destino)."];
      case "add a0 a1": return ["Add", multiline(
        "Adiciona a1 a a0 (a1 += a0), armazenando o resultado em a1 (destino).",
        "C = Carry (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "sub a0 a1": return ["Subtract", multiline(
        "Subtrai a0 de a1 (a1 -= a0), armazenando o resultado em a1 (destino).",
        "C = Borrow (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "cmp a0 a1": return ["Compare", multiline(
        "Subtrai a1 de a0 (a0 - a1) para fins de comparação, atualizando as flags sem armazenar o resultado.",
        "C = Borrow (considerando operandos sem-sinal);",
        "V = Overflow (em complemento de 2)."
      )];
      case "and a0 a1": return ["And", "Realiza um 'e' lógico entre a0 e a1 (a1 &= a0), armazenando o resultado em a1 (destino)."];
      case "or a0 a1": return ["Or", "Realiza um 'ou' lógico entre a0 e a1 (a1 |= a0), armazenando o resultado em a1 (destino)."];

      case "hlt": return Texts.getInstructionDescription(assemblyFormat, null); // Reuse description

      default: assertUnreachable(`Missing description for assembly format: ${assemblyFormat}`);
    }
  }

  public static getAddressingModeDescription(addressingModeCode: AddressingModeCode, machine: Machine): AddressingModeDescription {
    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT: return {
        name: "Direto",
        description: "Valor de 'a' representa o endereço do operando, ou endereço de desvio em operações de jump.",
        examples: "Exemplos: JMP 128 | JMP Label | JMP Label+1"
      };

      case AddressingModeCode.INDIRECT: return {
        name: "Indireto",
        description: "Valor de 'a' representa o endereço que contém o endereço direto.",
        examples: "Exemplos: JMP 128,I | JMP Label,I"
      };

      case AddressingModeCode.IMMEDIATE: return {
        name: "Imediato",
        description: "Valor de 'a' representa não um endereço, mas um número ou caractere imediato a ser carregado ou utilizado em operações aritméticas/lógicas.",
        examples: Texts.getImmediateExamplesText(machine)
      };

      case AddressingModeCode.INDEXED_BY_X: return {
        name: "Indexado por X",
        description: "Endereçamento direto com deslocamento (offset). O endereço do operando é a soma (em complemento de 2) dos valores de 'a' e do registrador X.",
        examples: "Exemplos: JMP 128,X | JMP Label,X"
      };

      case AddressingModeCode.INDEXED_BY_PC: return {
        name: "Indexado por PC",
        description: "Endereçamento direto com deslocamento (offset). O endereço do operando é a soma (em complemento de 2) dos valores de 'a' e do registrador PC (endereço da instrução seguinte).",
        examples: "Exemplos: JMP 128,PC | JMP Label,PC"
      };

      // Cesar

      case AddressingModeCode.REGISTER: return {
        name: "Registrador",
        description: "Operando é o próprio registrador.",
        examples: "Exemplo: NOT R0"
      };

      case AddressingModeCode.REGISTER_POST_INC: return {
        name: "Registrador Pós-Incrementado",
        description: multiline(
          "O endereço do operando ou desvio é indicado pelo valor do registrador.",
          "O registrador é incrementado em 2 após o uso."
        ),
        examples: "Exemplo: NOT (R0)+"
      };

      case AddressingModeCode.REGISTER_PRE_DEC: return {
        name: "Registrador Pré-Decrementado",
        description: multiline(
          "O endereço do operando ou desvio é indicado pelo valor do registrador.",
          "O registrador é decrementado em 2 antes do uso."
        ),
        examples: "Exemplo: NOT -(R0)"
      };

      case AddressingModeCode.REGISTER_INDEXED: return {
        name: "Indexado",
        description: "O endereço do operando ou desvio é a soma do valor do registrador com um deslocamento (offset).",
        examples: "Exemplos: NOT 32(R0) | NOT -16384(R0) | NOT Label(R0)"
      };

      case AddressingModeCode.INDIRECT_REGISTER: return {
        name: "Indireto",
        description: "O endereço do operando ou desvio é indicado pelo valor do registrador.",
        examples: "Exemplo: NOT (R0)"
      };

      case AddressingModeCode.INDIRECT_REGISTER_POST_INC: return {
        name: "Registrador Pós-Incrementado Indireto",
        description: multiline(
          "Valor do registrador é o endereço intermediário, que por sua vez contém o endereço final do operando ou desvio.",
          "O registrador é incrementado em 2 após o uso."
        ),
        examples: "Exemplo: NOT ((R0)+)"
      };

      case AddressingModeCode.INDIRECT_REGISTER_PRE_DEC: return {
        name: "Registrador Pré-Decrementado Indireto",
        description: multiline(
          "Valor do registrador é o endereço intermediário, que por sua vez contém o endereço final do operando ou desvio.",
          "O registrador é decrementado em 2 após o uso."
        ),
        examples: "Exemplo: NOT (-(R0))"
      };

      case AddressingModeCode.INDIRECT_REGISTER_INDEXED: return {
        name: "Indexado Indireto",
        description: "Valor do registrador somado ao deslocamento (offset) é o endereço intermediário, que por sua vez contém o endereço final do operando ou desvio.",
        examples: "Exemplos: NOT (32(R0)) | NOT (-16384(R0)) | NOT (Label(R0)"
      };
    }
  }

  private static getImmediateExamplesText(machine: Machine): string {
    let example = null;

    if (machine.hasAssemblyFormat("add a")) {
      example = "Exemplos: ADD #1 | ADD #'a'";
    } else if (machine.hasAssemblyFormat("add r a") && machine.hasRegister("A")) {
      example = "Exemplos: ADD A #1 | ADD A #'a'";
    } else if (machine.hasAssemblyFormat("psh a")) {
      example = "Exemplos: PSH #1 | PSH #'a'";
    }

    assert(example, `No immediate examples available for machine: ${machine.getName()}`);
    return example;
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
