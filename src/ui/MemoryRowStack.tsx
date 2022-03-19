import React, { useState, useEffect } from "react";
import { Volta } from "../machines/Volta";

export default function MemoryRowStack({ address, voltaMachine }: { address: number, voltaMachine: Volta }) {
  const [value, setValue] = useState(String(voltaMachine.getStackValue(address)));
  const [isCurrentStackPos, setIsCurrentStackPos] = useState(voltaMachine.getSPValue() === address);

  useEffect(() => {
    // Restore values on machine change
    setValue(String(voltaMachine.getStackValue(address)));
    setIsCurrentStackPos(voltaMachine.getSPValue() === address);

    // Event subscriptions
    voltaMachine.subscribeToEvent("REG.SP", (newValue, oldValue) => {
      if (oldValue === address || newValue === address) {
        setIsCurrentStackPos(newValue === address);
      }
    });
    voltaMachine.subscribeToEvent(`STACK.${address}`, (newValue) => setValue(String(newValue)));
  }, [voltaMachine]);

  return (
    <tr>
      <td>{isCurrentStackPos ? "→" : ""}</td>
      <td className="table-address">{address}</td>
      <td><input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        voltaMachine.setStackValue(address, Number(event.target.value)); // Write value to stack on focus out
      }} /></td>
    </tr>
  );
}
