﻿;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Arquivo para teste das instruções da
;; Máquina Neander no Hidra
;;
;; RESULTADO ESPERADO:
;; A partir de 200, cada teste deve escrever o
;; valor 255 (0xFF) na memória.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test00:	ORG, DB
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	ORG	200
Test00:	DB	255

;; Labels para os outros testes:

Test01:	DB	1
Test02:	DB	1
Test03:	DB	1
Test04:	DB	1
Test05:	DB	1
Test06:	DB	1
Test07:	DB	1
Test08:	DB	1
Test09:	DB	1
Test10:	DB	1

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
; Constantes:
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	ORG	128

Val000:	DB	0

Val007:	DB	7	; 0b00000111
Val028:	DB	28	; 0b00011100

Val063:	DB	63
Val121:	DB	121
Val127:	DB	127
Val128:	DB	128
Val224:	DB	224
Val248:	DB	248
Val249:	DB	249
Val251:	DB	251
Val255:	DB	255

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test01: LDA, STA
;; 2 Instruções, 6 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	ORG	0
	
	LDA	200	; (Endereço de Test00)
	STA	201	; Copia o valor 255 de Test00 para Test01

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test02: Labels
;; 2 Instruções, 6 Acessos / Total:	4 Instruções, 12 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val255
	STA	Test02	; Copia o valor 255 para Test02

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test03: ADD (com overflow)
;; 4 Instruções, 12 Acessos / Total:	8 Instruções, 24 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val224
	ADD	Val224	; 224 + 224 = 192 (overflow)
	ADD	Val063	; 192 + 63 = 255
	STA	Test03

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test04: OR
;; 4 Instruções, 12 Acessos / Total:	12 Instruções, 36 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val007
	OR	Val028	; 7 bitor 28 = 31
	ADD	Val224	; 31 + 224 = 255
	STA	Test04

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test05: AND
;; 4 Instruções, 12 Acessos / Total:	16 Instruções, 48 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val007
	AND	Val028	; 7 bitand 28 = 4
	ADD	Val251	; 4 + 251 = 255
	STA	Test05

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test06: NOT
;; 4 Instruções, 10 Acessos / Total:	20 Instruções, 58 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val007
	NOT		; bitnot 7 = 248
	ADD	Val007	; 248 + 7 = 255
	STA	Test06

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test07: NOP, JMP
;; 4 Instruções, 9 Acessos / Total:	24 Instruções, 67 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	NOP
	LDA	Val255
	JMP	Jump01	; Pula próxima instrução
	LDA	Val007	; Nunca executada

Jump01:	STA	Test07

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test08: JN
;; 6 Instruções, 16 Acessos / Total:	30 Instruções, 83 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val007
	JN	Jump02	; Jump ignorado
	ADD	Val121	; 7 + 121 = 128 (negativo)

Jump02:	JN	Jump03	; Pula próxima instrução
	LDA	Val028	; Nunca executada

Jump03:	ADD	Val127	; 128 + 127 = 255
	STA	Test08	;

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test09: JZ
;; 6 Instruções, 16 Acessos / Total:	36 Instruções, 99 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val007
	JZ	Jump04	; Jump ignorado
	ADD	Val249	; 7 + 249 = 0 (overflow)

Jump04:	JZ	Jump05	; Pula próxima instrução
	LDA	Val028	; Nunca executada

Jump05:	ADD	Val255	; 0 + 255 = 255
	STA	Test09


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Test10: HLT
;; 3 Instruções, 7 Acessos / Total:	39 Instruções, 106 Acessos
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

	LDA	Val255
	STA	Test10
	HLT		; O programa deve parar aqui
	LDA	Val007
	STA	Test10
