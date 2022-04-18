# Hidra Web

![Coverage](coverage.svg?raw=true "Title")

Este projeto é uma versão do [Hidra](https://github.com/petcomputacaoufrgs/hidracpp) para ambiente web, utilizando TypeScript e React.

## Link para acesso

*Acesse a aplicação em:* ***https://felipeal.github.io/hidra-web***

## Sobre o Hidra

O Hidra é um ambiente de desenvolvimento integrado (IDE) para as máquinas teóricas estudadas nas disciplinas de Arquitetura e Organização de Computadores da UFRGS e demais universidades.

O software unifica as tarefas de montagem, simulação e depuração em um ambiente favorável ao desenvolvimento, permitindo que o estudante possa se concentrar nas diferentes características de cada arquitetura.

## Arquiteturas simuladas

O Hidra simula diferentes máquinas, criadas pelos professores Raul Fernando Weber e Taisy Silva Weber, e utilizadas nas disciplinas de Arquitetura e Organização de Computadores:

* *Neander*: arquitetura simples de 8-bits, criada para fins didáticos.
* *Ahmes*: evolução do Neander, com instruções para facilitar a execução de operações aritméticas.
* *Ramses*: evolução do Neander, com múltiplos registradores e modos de endereçamento.

O Hidra também traz a simulação de variações das arquiteturas acima:

* *Cromag*: variação do Neander, com modo de endereçamento indireto e flag C (carry).
* *Queops*: variação do Neander, seu diferencial é o modo de endereçamento relativo ao PC.
* *Pitagoras*: semelhante ao Ahmes, porém sem as flags V (overflow) e B (borrow).
* *Pericles*: instruções do Ramses e dados de 8 bits, mas com memória de 4096 bytes e endereços de 12 bits.

São também simuladas duas arquiteturas diferenciadas:

* *REG*: conjunto de instruções limitado, inspirado em máquinas universais, mas com grande número de registradores.
* *Volta*: máquina de pilha, em homenagem a Alessandro Volta, com memória dedicada à pilha e instruções que utilizam operandos do topo da pilha.

As máquinas Neander, Ahmes e Ramses foram desenvolvidas com base nos simuladores disponíveis, e as demais máquinas foram desenvolvidas de acordo com as especificações presentes no livro *Fundamentos de Arquitetura de Computadores*, do Prof. Raul Fernando Weber.

*Nota: durante o uso, você pode posicionar o cursor sobre as diferentes instruções, diretivas e modos de endereçamento presentes na tela para obter descrições detalhadas.*

## Estrutura do projeto

O projeto é dividido em dois módulos:

* **src/core**: contém o código para as máquinas, o assembler, conversores e descrições, bem como as definições para as nove máquinas implementadas. Funciona de forma isolada (agnóstica) de um framework de UI.

* **src/ui**: contém o código para renderização da tela e ações do usuário, em React, e código para carregamento/exportação de arquivos.

Os testes para ambos os módulos estão disponíveis em uma terceira pasta:

* **src/tests**: contém testes para o assembler, as diferentes máquinas e comparações de memória com o assembler Daedalus e os simuladores originais em Delphi. Contém também testes de interações com a UI e gerenciamento de arquivos.
