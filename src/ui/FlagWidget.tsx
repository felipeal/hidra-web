import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";

export default function FlagWidget({ name, machine }: { name: string, machine: Machine }) {
  const [value, setValue] = useState(machine.isFlagTrue(name));

  useEffect(() => {
    // Restore values on machine change
    setValue(machine.isFlagTrue(name));

    // Event subscriptions
    return machine.subscribeToEvent(`FLAG.${name}`, (newValue) => setValue(newValue as boolean));
  }, [machine, name]);

  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: "4px" }}>
      <input className="machine-flag" id={`flag-${name}-input`} type="checkbox" checked={value} disabled />
      <label htmlFor={`flag-${name}-input`}>{name}</label>
    </div>
  );
}
