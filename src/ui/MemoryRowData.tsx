import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { addressToHex, unsignedByteToString, charCodeToString, uncheckedByteStringToNumber } from "../core/utils/Conversions";
import { Machine } from "../core/Machine";
import { buildUnsubscribeCallback } from "../core/utils/EventUtils";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".data-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowData({ address, machine, assembler, displayHex, displayNegative, displayChars }:
  { address: number, machine: Machine, assembler: Assembler, displayHex: boolean, displayNegative: boolean, displayChars: boolean }
) {
  const [value, setValue] = useState(unsignedByteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
  const [label, setLabel] = useState(assembler.getAddressCorrespondingLabel(address));

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
    setLabel(assembler.getAddressCorrespondingLabel(address));

    // Event subscriptions
    return buildUnsubscribeCallback([
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex, displayNegative }))),
      assembler.subscribeToEvent(`LABEL.${address}`, (newLabel) => setLabel(String(newLabel)))
    ]);
  }, [machine, assembler, displayHex, displayNegative, address]);

  return (
    <tr className={machine.getDefaultDataStartingAddress() === address ? "first-data-row" : undefined}>
      <td className="table-address">{displayHex ? addressToHex(address, machine.getMemorySize()) : address}</td>
      <td>
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
      </td>
      {displayChars && <td>{charCodeToString(uncheckedByteStringToNumber(value, { displayHex }))}</td>}
      <td style={{ maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</td>
    </tr>
  );
}
