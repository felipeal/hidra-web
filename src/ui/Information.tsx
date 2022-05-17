import React, { useState, useEffect } from "react";
import { Machine } from "../core/Machine";
import { buildUnsubscribeCallback } from "../core/utils/EventUtils";

export default function Information({ machine, keyboardOn }: { machine: Machine, keyboardOn: boolean | null }) {
  const [instructionCount, setInstructionCount] = useState(machine.getInstructionCount());
  const [accessCount, setAccessCount] = useState(machine.getAccessCount());

  useEffect(() => {
    // Restore values on machine change
    setInstructionCount(machine.getInstructionCount());
    setAccessCount(machine.getAccessCount());

    // Event subscriptions
    return buildUnsubscribeCallback([
      machine.subscribeToEvent("INS.COUNT", (newValue) => setInstructionCount(newValue as number)),
      machine.subscribeToEvent("ACC.COUNT", (newValue) => setAccessCount(newValue as number))
    ]);
  }, [machine]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      Instruções: {instructionCount} - Acessos: {accessCount}{(keyboardOn !== null) ? ` - Teclado: ${keyboardOn ? "Ativado" : "Desativado"}` : ""}
    </div>
  );
}
