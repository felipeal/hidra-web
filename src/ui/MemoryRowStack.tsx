import React, { useState, useEffect } from "react";
import { charCodeToString } from "../core/Conversions";
import { Volta } from "../machines/Volta";

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".stack-table .table-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

export default function MemoryRowStack({ row, address, voltaMachine, displayChars }: { row: number, address: number, voltaMachine: Volta, displayChars: boolean }) {
  const [value, setValue] = useState(String(voltaMachine.getStackValue(address)));
  const [isCurrentStackPos, setIsCurrentStackPos] = useState(voltaMachine.getSPValue() === address);
  const [isAboveStackPos, setIsAboveStackPos] = useState(address > voltaMachine.getSPValue());

  useEffect(() => {
    // Restore values on machine change
    setValue(String(voltaMachine.getStackValue(address)));
    setIsCurrentStackPos(voltaMachine.getSPValue() === address);
    setIsAboveStackPos(address > voltaMachine.getSPValue());

    // Event subscriptions
    voltaMachine.subscribeToEvent("REG.SP", (newValue) => {
      setIsCurrentStackPos(Number(newValue) === address);
      setIsAboveStackPos(address > Number(newValue));
    });
    voltaMachine.subscribeToEvent(`STACK.${address}`, (newValue) => setValue(String(newValue)));
  }, [voltaMachine]);

  return (
    <tr>
      <td className="monospace-font pc-sp-arrow">{isCurrentStackPos ? "→" : ""}</td>
      <td className="table-address">{address}</td>
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
