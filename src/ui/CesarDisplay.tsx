import React, { useEffect, useState } from "react";
import { Machine } from "../core/Machine";
import { charCodeToString } from "../core/utils/Conversions";
import { range } from "../core/utils/FunctionUtils";

const DISPLAY_ADDRESS = 65500;

export default function CesarDisplay({ machine }: { machine: Machine }) {
  return <div className="display" style={{ display: "flex" }}>
    {range(36).map((charIndex) => (
      <CesarDisplayChar key={charIndex} address={DISPLAY_ADDRESS + charIndex} machine={machine} />
    ))}
  </div>;
}

function CesarDisplayChar({ address, machine }: { address: number, machine: Machine }) {
  const [value, setValue] = useState(machine.getMemoryValue(address));

  useEffect(() => {
    // Restore values on external change
    setValue(machine.getMemoryValue(address));

    // Event subscriptions
    return machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(newValue as number));
  }, [machine, address]);

  return <div className="display-char monospace-font" style={{ width: `${100 / 36}%` }}>
    {charCodeToString(value) || " "}
  </div>;
}
