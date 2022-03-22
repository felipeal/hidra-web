import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".data-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowData({ address, machine, assembler }: { address: number, machine: Machine, assembler: Assembler }) {
  const [value, setValue] = useState(String(machine.getMemoryValue(address)));
  const [label, setLabel] = useState(assembler.getAddressCorrespondingLabel(address));

  useEffect(() => {
    // Restore values on machine change
    setValue(String(machine.getMemoryValue(address)));

    // Event subscriptions
    machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(String(newValue)));
  }, [machine]);

  useEffect(() => {
    // Restore values on assembler change
    setLabel(assembler.getAddressCorrespondingLabel(address));

    // Event subscriptions
    assembler.subscribeToEvent(`LABEL.${address}`, (newValue) => setLabel(String(newValue)));
  }, [assembler]);

  return (
    <tr className={machine.getDefaultDataStartingAddress() === address ? "first-data-row" : undefined}>
      <td className="table-address">{address}</td>
      <td>
        <input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
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
        }} />
      </td>
      <td style={{ maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</td>
    </tr>
  );
}
