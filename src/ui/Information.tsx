import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";

export default function Information({ machine }: { machine: Machine }) {
  const [instructionCount, setInstructionCount] = useState(machine.getInstructionCount());
  const [accessCount, setAccessCount] = useState(machine.getAccessCount());

  useEffect(() => {
    // Restore values on machine change
    setInstructionCount(machine.getInstructionCount());
    setAccessCount(machine.getAccessCount());

    // Event subscriptions
    machine.subscribeToEvent("INS.COUNT", (newValue) => setInstructionCount(newValue as number));
    machine.subscribeToEvent("ACC.COUNT", (newValue) => setAccessCount(newValue as number));
  }, [machine]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      Instruções: {instructionCount} - Acessos: {accessCount}
    </div>
  );
}
