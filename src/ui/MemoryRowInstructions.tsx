import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";

function computeIsCurrentInstruction(address: number, assembler: Assembler): boolean {
  const addressSourceLine = assembler.getAddressCorrespondingSourceLine(address);
  const currentSourceLine = (addressSourceLine >= 0) && assembler.getPCCorrespondingSourceLine();
  return addressSourceLine === currentSourceLine;
}

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".instructions-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowInstructions({ address, machine, assembler }: { address: number, machine: Machine, assembler: Assembler }) {
  const [value, setValue] = useState(String(machine.getMemoryValue(address)));
  const [instructionString, setInstructionString] = useState(String(machine.getInstructionString(address)));
  const [isCurrentPos, setIsCurrentPos] = useState(machine.getPCValue() === address);
  const [isCurrentInstruction, setIsCurrentInstruction] = useState(computeIsCurrentInstruction(address, assembler));

  useEffect(() => {
    // Restore values on machine change
    setValue(String(machine.getMemoryValue(address)));
    setInstructionString(machine.getInstructionString(address));
    setIsCurrentPos(machine.getPCValue() === address);
    setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));

    // Event subscriptions
    machine.subscribeToEvent(`REG.${machine.getPCName()}`, (newValue) => {
      setIsCurrentPos(newValue === address);
      setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));
    });
    machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(String(newValue)));
    machine.subscribeToEvent(`INS.STR.${address}`, (newValue) => setInstructionString(newValue as string));
  }, [machine]);

  return (
    <tr className={isCurrentInstruction ? "current-pc-line" : undefined}>
      <td className="monospace-font pc-sp-arrow">{isCurrentPos ? "→" : ""}</td>
      <td className="table-address">{address}</td>
      <td><input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        machine.setMemoryValue(address, Number(event.target.value)); // Write value to memory on focus out
        machine.updateInstructionStrings();
      }} onKeyDown={(event) => {
        if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
          focusInput(address - 1);
        } else if (event.key === "ArrowDown" || event.key === "Enter") {
          focusInput(address + 1);
        }
      }} onFocus={(event) => {
        setTimeout(() => (event.target as HTMLInputElement).select(), 0);
      }} /></td>
      <td>{instructionString}</td>
    </tr>
  );
}
