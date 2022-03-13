import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";

export default function DataRow({ address, machine }: { address: number, machine: Machine }) {
  const [value, setValue] = useState(String(machine.getMemoryValue(address)));
  const [label, setLabel] = useState(machine.getAddressCorrespondingLabel(address));

  useEffect(() => {
    // Restore values on machine change
    setValue(String(machine.getMemoryValue(address)));
    setLabel(machine.getAddressCorrespondingLabel(address));

    // Event subscriptions
    machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(String(newValue)));
    machine.subscribeToEvent(`LABEL.${address}`, (newValue) => setLabel(String(newValue)));
  }, [machine, address]);

  return (
    <tr>
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
