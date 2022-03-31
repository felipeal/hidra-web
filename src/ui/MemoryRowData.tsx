import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { addressToHexString, byteToString, charCodeToString } from "../core/Conversions";
import { Machine } from "../core/Machine";
import { buildUnsubscribeCallback } from "../core/Utils";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".data-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowData({ address, machine, assembler, displayHex, displayNegative, displayChars }:
  { address: number, machine: Machine, assembler: Assembler, displayHex: boolean, displayNegative: boolean, displayChars: boolean }
) {
  const [value, setValue] = useState(byteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
  const [label, setLabel] = useState(assembler.getAddressCorrespondingLabel(address));

  useEffect(() => {
    // Restore values on external change
    setValue(byteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
    setLabel(assembler.getAddressCorrespondingLabel(address));

    // Event subscriptions
    return buildUnsubscribeCallback([
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(byteToString(newValue as number, { displayHex, displayNegative }))),
      assembler.subscribeToEvent(`LABEL.${address}`, (newLabel) => setLabel(String(newLabel)))
    ]);
  }, [machine, assembler, displayHex, displayNegative, address]);

  return (
    <tr className={machine.getDefaultDataStartingAddress() === address ? "first-data-row" : undefined}>
      <td className="table-address">{displayHex ? addressToHexString(address, machine.getMemorySize()) : address}</td>
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
      {displayChars && <td>{charCodeToString(Number(value))}</td>}
      {/* // TODO: Recheck "value" on interaction with displayHex/Negative */}
      <td style={{ maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</td>
    </tr>
  );
}
