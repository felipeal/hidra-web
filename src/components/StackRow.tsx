import React, { useState, useEffect } from "react";
import { Volta } from "../machines/Volta";

export default function StackRow({ address, voltaMachine }: { address: number, voltaMachine: Volta }) {
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
  }, [voltaMachine, address]);

  return (
    <tr>
      <td style={{ padding: "4px" }}>{isCurrentStackPos ? "→" : ""}</td>
      <td style={{ padding: "4px", color: "gray" }}>{address}</td>
      <td><input style={{ width: "50px" }} inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        voltaMachine.setStackValue(address, Number(event.target.value)); // Write value to stack on focus out
      }} /></td>
    </tr>
  );
}
