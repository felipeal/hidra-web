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
    machine.subscribeToEvent(`INS.STR.${address}`, (newValue) => setInstructionString(newValue as string));
  }, [machine]);

  return (
    <tr>
      <td>{isCurrentPos ? "→" : ""}</td>
      <td className="table-address">{address}</td>
      <td><input className="table-value" inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        machine.setMemoryValue(address, Number(event.target.value)); // Write value to memory on focus out
      }} /></td>
      <td>{instructionString}</td>
    </tr>
  );
}
