import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { unsignedByteToString, addressToHex, instructionStringToHex, memoryStringToNumber } from "../core/Conversions";
import { Machine } from "../core/Machine";
import { buildUnsubscribeCallback } from "../core/Utils";

function computeIsCurrentInstruction(address: number, assembler: Assembler): boolean {
  const addressSourceLine = assembler.getAddressCorrespondingSourceLine(address);
  const currentSourceLine = (addressSourceLine >= 0) && assembler.getPCCorrespondingSourceLine();
  return addressSourceLine === currentSourceLine;
}

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".instructions-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowInstructions({ address, machine, assembler, displayHex }:
  { address: number, machine: Machine, assembler: Assembler, displayHex: boolean}
) {
  const [value, setValue] = useState(unsignedByteToString(machine.getMemoryValue(address), { displayHex }));
  const [instructionString, setInstructionString] = useState(String(machine.getInstructionString(address)));
  const [isCurrentPos, setIsCurrentPos] = useState(machine.getPCValue() === address);
  const [isCurrentInstruction, setIsCurrentInstruction] = useState(computeIsCurrentInstruction(address, assembler));

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(machine.getMemoryValue(address), { displayHex }));
    setInstructionString(machine.getInstructionString(address));
    setIsCurrentPos(machine.getPCValue() === address);
    setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));

    // Event subscriptions
    return buildUnsubscribeCallback([
      machine.subscribeToEvent(`REG.${machine.getPCName()}`, (newValue) => {
        setIsCurrentPos(newValue === address);
        setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));
      }),
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex }))),
      machine.subscribeToEvent(`INS.STR.${address}`, (newValue) => setInstructionString(newValue as string))
    ]);
  }, [machine, assembler, displayHex, address]);

  return (
    <tr className={isCurrentInstruction ? "current-pc-line" : undefined}>
      <td className="monospace-font pc-sp-arrow pc-cell" onClick={() => machine.setPCValue(address)}>
        {isCurrentPos ? "→" : ""}
      </td>
      <td className="table-address">{displayHex ? addressToHex(address, machine.getMemorySize()) : address}</td>
      <td>
        <input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          machine.setMemoryValue(address, memoryStringToNumber(event.target.value, { displayHex }));
          machine.updateInstructionStrings();
        }} onKeyDown={(event) => {
          if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
            focusInput(address - 1);
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            focusInput(address + 1);
          }
        }} onFocus={(event) => {
          setTimeout(() => (event.target as HTMLInputElement).select(), 0);
        }} />
      </td>
      <td>{displayHex ? instructionStringToHex(instructionString) : instructionString}</td>
    </tr>
  );
}
