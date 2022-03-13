import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";

export default function InstructionsRow({ address, machine }: { address: number, machine: Machine }) {
  const [value, setValue] = useState(String(machine.getMemoryValue(address)));
  const [instructionString, setInstructionString] = useState(String(machine.getInstructionString(address)));
  const [isCurrentPos, setIsCurrentPos] = useState(machine.getPCValue() === address);

  useEffect(() => {
    // Restore values on machine change
    setValue(String(machine.getMemoryValue(address)));
    setInstructionString(machine.getInstructionString(address));
    setIsCurrentPos(machine.getPCValue() === address);

    // Event subscriptions
    machine.subscribeToEvent(`REG.${machine.getPCName()}`, (newValue, oldValue) => {
      if (oldValue === address || newValue === address) {
        setIsCurrentPos(newValue === address);
      }
    });
    machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(String(newValue)));
    machine.subscribeToEvent(`INS.${address}`, (newValue) => setInstructionString(newValue as string));
  }, [machine, address]);

  return (
    <tr>
      <td style={{ padding: "4px" }}>{isCurrentPos ? "→" : ""}</td>
      <td style={{ padding: "4px", color: "gray" }}>{address}</td>
      <td><input style={{ width: "50px" }} inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        machine.setMemoryValue(address, Number(event.target.value)); // Write value to memory on focus out
      }} /></td>
      <td style={{ padding: "4px" }}>{instructionString}</td>
    </tr>
  );
}
