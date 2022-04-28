import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { unsignedByteToString, addressToHex, instructionStringToHex, uncheckedByteStringToNumber } from "../core/utils/Conversions";
import { Machine } from "../core/Machine";
import { buildUnsubscribeCallback } from "../core/utils/EventUtils";
import { classes, toPx } from "./utils/LayoutUtils";

function computeIsCurrentInstruction(address: number, assembler: Assembler): boolean {
  const addressSourceLine = assembler.getAddressCorrespondingSourceLine(address);
  const currentSourceLine = (addressSourceLine >= 0) && assembler.getPCCorrespondingSourceLine();
  return addressSourceLine === currentSourceLine;
}

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".instructions-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryInstructionsRow({ columnWidths, style, address, machine, assembler, displayHex }:
  { columnWidths: number[], style: React.CSSProperties, address: number, machine: Machine, assembler: Assembler, displayHex: boolean}
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
    <div style={{ ...style, display: "flex" }}
      className={classes("tr", "instruction-row", (isCurrentInstruction ? "current-instruction-line" : ""))}
    >
      <div style={{ width: toPx(columnWidths[0]) }}
        className="monospace-font pc-sp-arrow pc-sp-cell td" onClick={() => machine.setPCValue(address)}>
        {isCurrentPos ? "→" : ""}
      </div>

      <div style={{ width: toPx(columnWidths[1]) }}
        className="table-address td">{displayHex ? addressToHex(address, machine.getMemorySize()) : address}</div>

      <div className="td" style={{ width: toPx(columnWidths[2]) }}>
        <input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          machine.setMemoryValue(address, uncheckedByteStringToNumber(event.target.value, { displayHex }));
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
      </div>

      <div className="td" style={{ width: toPx(columnWidths[3]) }}>
        {displayHex ? instructionStringToHex(instructionString) : instructionString}
      </div>
    </div>
  );
}
