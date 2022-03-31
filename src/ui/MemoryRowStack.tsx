import React, { useState, useEffect } from "react";
import { addressToHex, unsignedByteToString, charCodeToString } from "../core/Conversions";
import { buildUnsubscribeCallback } from "../core/Utils";
import { Volta } from "../machines/Volta";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".stack-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowStack({ row, address, voltaMachine, displayHex, displayNegative, displayChars }:
  { row: number, address: number, voltaMachine: Volta, displayHex: boolean, displayNegative: boolean, displayChars: boolean }
) {
  const [value, setValue] = useState(unsignedByteToString(voltaMachine.getStackValue(address), { displayHex, displayNegative }));
  const [isCurrentStackPos, setIsCurrentStackPos] = useState(voltaMachine.getSPValue() === address);
  const [isAboveStackPos, setIsAboveStackPos] = useState(address > voltaMachine.getSPValue());

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(voltaMachine.getStackValue(address), { displayHex, displayNegative }));
    setIsCurrentStackPos(voltaMachine.getSPValue() === address);
    setIsAboveStackPos(address > voltaMachine.getSPValue());

    // Event subscriptions
    return buildUnsubscribeCallback([
      voltaMachine.subscribeToEvent("REG.SP", (newSPAddress) => {
        setIsCurrentStackPos((newSPAddress as number) === address);
        setIsAboveStackPos(address > (newSPAddress as number));
      }),
      voltaMachine.subscribeToEvent(`STACK.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex, displayNegative })))
    ]);
  }, [voltaMachine, displayHex, displayNegative, address]);

  return (
    <tr>
      <td className="monospace-font pc-sp-arrow">{isCurrentStackPos ? "→" : ""}</td>
      <td className="table-address">{displayHex ? addressToHex(address, voltaMachine.getStackSize()) : address}</td>
      <td>
        <input className={`table-value ${isAboveStackPos ? "table-value-above-sp" : ""}`} inputMode="numeric" value={value} onChange={(event) => {
          setValue(String(event.target.value));
        }} onBlur={(event) => {
          voltaMachine.setStackValue(address, Number(event.target.value)); // Write value to stack on focus out
        }} onKeyDown={(event) => {
          if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
            focusInput(row - 1);
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            focusInput(row + 1);
          }
        }} onFocus={(event) => {
          setTimeout(() => (event.target as HTMLInputElement).select(), 0);
        }} />
      </td>
      {displayChars && <td>{charCodeToString(Number(value))}</td>} {/* // TODO: Recheck on interaction with displayHex/Negative */}
    </tr>
  );
}
