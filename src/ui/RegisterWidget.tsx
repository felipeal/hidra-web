import React, { useEffect, useState } from "react";
import { Machine } from "../core/Machine";
import { registerValueToString } from "../core/utils/Conversions";

export default function RegisterWidget({ name, machine, displayHex, displayNegative }:
  { name: string, machine: Machine, displayHex: boolean, displayNegative: boolean }
) {
  const [value, setValue] = useState(String(machine.getRegisterValue(name)));

  useEffect(() => {
    // Restore values on machine change
    setValue(registerValueToString(machine.getRegisterInfo(name), { displayHex, displayNegative }));

    // Event subscriptions
    return machine.subscribeToEvent(`REG.${name}`, () => setValue(registerValueToString(machine.getRegisterInfo(name), { displayHex, displayNegative })));
  }, [machine, displayHex, displayNegative, name]);

  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "end", alignItems: "center", gap: "8px", width: "128px" }}>
      <label htmlFor={`register-${name}-div`}>{name}</label>
      <input className="machine-register-display" id={`register-${name}-div`} readOnly style={{
        padding: "4px", width: "64px", marginRight: "16px"
      }} value={value} />
    </div>
  );
}
