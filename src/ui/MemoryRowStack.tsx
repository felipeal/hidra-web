import React, { useState, useEffect } from "react";
import { addressToHex, unsignedByteToString, charCodeToString, uncheckedByteStringToNumber } from "../core/utils/Conversions";
import { buildUnsubscribeCallback } from "../core/utils/EventUtils";
import { Volta } from "../core/machines/Volta";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".stack-table .memory-value");
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
      <td className="monospace-font pc-sp-arrow memory-pc-sp-cell" onClick={() => voltaMachine.setSPValue(address)}>
        {isCurrentStackPos ? "→" : ""}
      </td>
      <td className="memory-address">{displayHex ? addressToHex(address, voltaMachine.getStackSize()) : address}</td>
      <td>
        <input className={`memory-value ${isAboveStackPos ? "memory-value-above-sp" : ""}`} inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          voltaMachine.setStackValue(address, uncheckedByteStringToNumber(event.target.value, { displayHex }));
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
      {displayChars && <td>{charCodeToString(uncheckedByteStringToNumber(value, { displayHex }))}</td>}
    </tr>
  );
}
