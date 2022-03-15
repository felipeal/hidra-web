import React, { useState, useEffect } from "react";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";

export default function DataRow({ address, machine, assembler }: { address: number, machine: Machine, assembler: Assembler }) {
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
      <td style={{ padding: "4px", color: "gray" }}>{address}</td>
      <td><input style={{ width: "50px" }} inputMode="numeric" value={value} onChange={(event) => {
        setValue(String(event.target.value));
      }} onBlur={(event) => {
        machine.setMemoryValue(address, Number(event.target.value)); // Write value to memory on focus out
      }} /></td>
      <td style={{ padding: "4px" }}>{label}</td>
    </tr>
  );
}
