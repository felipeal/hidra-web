import "./App.css";

import React, { ChangeEvent,  useState } from "react";
import codemirror from "codemirror";

// Components
import CodeEditor from "./ui/CodeEditor";
import InstructionsRow from "./components/InstructionsRow";
import DataRow from "./components/DataRow";
import StackRow from "./components/StackRow";
import FlagWidget from "./components/FlagWidget";
import RegisterWidget from "./components/RegisterWidget";
import Information from "./components/Information";

// Machines
import { Machine } from "./core/Machine";
import { Neander } from "./machines/Neander";
import { Ahmes } from "./machines/Ahmes";
import { Ramses } from "./machines/Ramses";
import { Cromag } from "./machines/Cromag";
import { Queops } from "./machines/Queops";
import { Pitagoras } from "./machines/Pitagoras";
import { Pericles } from "./machines/Pericles";
import { Reg } from "./machines/Reg";
import { Volta } from "./machines/Volta";

// Global pointer required for CodeMirror persistence between live-reloads
declare global {
  var codeMirrorInstance: codemirror.Editor; // eslint-disable-line no-var
}

window.onerror = function myErrorHandler(errorMessage) {
  alert(`Error: ${errorMessage}`);
  return false;
};

function App() {
  const [machine, setMachine] = useState(new Neander() as Machine);
  let timeout: NodeJS.Timeout;

  return (
    <div style={{ height: "calc(100vh - 32px)", display: "flex", margin: "16px", gap: "16px" }}>
      {/* Code area */}
      {/* <textarea style={{ height: "100%", border: "1px solid", flexGrow: 1, resize: "none", fontFamily: "monospace", fontSize: "1rem" }} /> */}
      <div style={{ border: "1px solid", flex: 1, overflow: "auto" }}>
        <CodeEditor machine={machine} />
      </div>

      {/* Instructions memory area */}
      <table style={{ height: "100%", display: "block", overflowY: "scroll" }}>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Address</th>
            <th>Value</th>
            <th>Instruction</th>
          </tr>
        </thead>
        <tbody>
          {machine.getMemory().map((value, address) => {
            return <InstructionsRow key={address} address={address} machine={machine} />;
          })}
        </tbody>
      </table>

      {/* Data memory area */}
      <table style={{ height: "100%", display: "block", overflowY: "scroll" }}>
        <thead>
          <tr>
            <th>Address</th>
            <th>Value</th>
            <th>Label</th>
          </tr>
        </thead>
        <tbody>
          {machine.getMemory().map((value, address) => {
            return <DataRow key={address} address={address} machine={machine} />;
          })}
        </tbody>
      </table>

      {/* Stack memory area */}
      {machine instanceof Volta && <table style={{ height: "100%", display: "block", overflowY: "scroll" }}>
        <thead>
          <tr>
            <th>SP</th>
            <th>Address</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {machine.getStack().map((value, index) => {
            return <StackRow key={index} address={machine.getStack().length - 1 - index} voltaMachine={machine} />;
          })}
        </tbody>
      </table>}

      {/* Machine area */}
      <div style={{ width: "360px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Machine select */}
        <select value={machine.getName()} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          clearTimeout(timeout);
          switch (event.target.value) {
            case "Neander": return setMachine(new Neander());
            case "Ahmes": return setMachine(new Ahmes());
            case "Ramses": return setMachine(new Ramses());
            case "Cromag": return setMachine(new Cromag());
            case "Queops": return setMachine(new Queops());
            case "Pitagoras": return setMachine(new Pitagoras());
            case "Pericles": return setMachine(new Pericles());
            case "REG": return setMachine(new Reg());
            case "Volta": return setMachine(new Volta());
          }
        }}>
          <option value="Neander">Neander</option>
          <option value="Ahmes">Ahmes</option>
          <option value="Ramses">Ramses</option>
          <option value="Cromag">Cromag</option>
          <option value="Queops">Queops</option>
          <option value="Pitagoras">Pitagoras</option>
          <option value="Pericles">Pericles</option>
          <option value="REG">REG</option>
          <option value="Volta">Volta</option>
        </select>

        {/* Flags */}
        <fieldset style={{ paddingTop: "16px", paddingBottom: "16px" }}>
          <legend>Flags</legend>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
            {machine.getFlags().map((flag, index) => {
              return <FlagWidget key={index} name={flag.getName()} machine={machine} />;
            })}
          </div>
        </fieldset>

        {/* Registers */}
        <fieldset style={{ paddingTop: "32px", paddingBottom: "32px" }}>
          <legend>Registers</legend>
          <div style={{ display: "grid", justifyContent: "center", gridTemplateColumns: "112px 112px", justifyItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {machine.getRegisters().map((register, index) => {
              return <RegisterWidget key={index} name={register.getName()} machine={machine} />;
            })}
          </div>
        </fieldset>

        {/* Information */}
        <fieldset style={{ paddingTop: "16px", paddingBottom: "16px" }}>
          <Information machine={machine} />
        </fieldset>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => {
            machine.assemble(window.codeMirrorInstance.getValue());
            machine.updateInstructionStrings();
          }}>Build</button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ flex: 1 }} onClick={() => {
              machine.setRunning(false);
              machine.setPCValue(0);
              if (machine.hasRegister("SP")) {
                machine.setRegisterValueByName("SP", 0);
              }
              machine.clearCounters();
            }}>Reset PC</button>
            <button style={{ flex: 1 }} onClick={() => {
              machine.setRunning(!machine.isRunning());
              const nextStep = function () {
                if (machine.isRunning()) {
                  machine.step();
                  timeout = setTimeout(nextStep, 10);
                }
              };
              nextStep();
            }}>Run</button>
            <button style={{ flex: 1 }} onClick={() => {
              machine.step();
            }}>Step</button>
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        {/* Instructions */}
        <fieldset>
          <legend>Instructions</legend>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
            {machine.getInstructions().map((instruction, index) => {
              return <div style={{ width: "40px", marginLeft: "8px", fontFamily: "monospace" }} key={index}>
                {instruction.getMnemonic().toUpperCase()}
              </div>;
            })}
          </div>
        </fieldset>

        {/* Addressing modes */}
        {(machine.getAddressingModes().length > 1) && (
          <fieldset>
            <legend>Addressing modes</legend>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
              {machine.getAddressingModes().map((addressingMode, index) => {
                return <div style={{ width: "40px", marginLeft: "8px", fontFamily: "monospace" }} key={index}>
                  {machine.getAddressingModeDescription(addressingMode.getAddressingModeCode()).acronym}
                </div>;
              })}
            </div>
          </fieldset>
        )}

      </div>
    </div>
  );
}

export default App;
