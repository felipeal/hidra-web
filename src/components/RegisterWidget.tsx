import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";

export default function RegisterWidget({ name, machine }: { name: string, machine: Machine }) {
  const [value, setValue] = useState(machine.getRegisterValueByName(name));

  useEffect(() => {
    // Restore values on machine change
    setValue(machine.getRegisterValueByName(name));

    // Event subscriptions
    machine.subscribeToEvent(`REG.${name}`, (newValue) => setValue(newValue as number));
  }, [machine, name]);

  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "end", alignItems: "center", gap: "8px", width: "128px" }}>
      <label htmlFor={`register-${name}-div`}>{name}</label>
      <div id={`register-${name}-div`} style={{ border: "1px solid", padding: "4px", width: "64px", marginRight: "16px" }}>{value}</div>
    </div>
  );
}
