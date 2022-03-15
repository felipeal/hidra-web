import "./App.css";

import React, { ChangeEvent, useEffect, useState } from "react";
import codemirror from "codemirror";

// Components
import CodeEditor from "./CodeEditor";
import InstructionsRow from "./InstructionsRow";
import DataRow from "./DataRow";
import StackRow from "./StackRow";
import FlagWidget from "./FlagWidget";
import RegisterWidget from "./RegisterWidget";
import Information from "./Information";

// Machines
import { Machine } from "../core/Machine";
import { Neander } from "../machines/Neander";
import { Ahmes } from "../machines/Ahmes";
import { Ramses } from "../machines/Ramses";
import { Cromag } from "../machines/Cromag";
import { Queops } from "../machines/Queops";
import { Pitagoras } from "../machines/Pitagoras";
import { Pericles } from "../machines/Pericles";
import { Reg } from "../machines/Reg";
import { Volta } from "../machines/Volta";
import { Assembler } from "../core/Assembler";

// Global pointer required for CodeMirror persistence between live-reloads
declare global {
  var codeMirrorInstance: codemirror.Editor; // eslint-disable-line no-var
}

window.onerror = function myErrorHandler(errorMessage) {
  alert(`Error: ${errorMessage}`);
  return false;
};

function scrollToFirstInstructionsRow() {
  const instructionsTable: HTMLElement | null = document.querySelector(".instructions-table");
  instructionsTable?.scrollTo(0, 0);
}

function scrollToFirstDataRow() {
  const firstDataRow: HTMLElement | null = document.querySelector(".first-data-row");
  if (firstDataRow) {
    const table = firstDataRow.parentElement!.parentElement!;
    const header = table.firstChild as HTMLElement;
    table?.scrollTo(0, firstDataRow.offsetTop - header.offsetHeight);
  }
}

function scrollToLastStackRow() {
  const stackTable: HTMLElement | null = document.querySelector(".stack-table");
  stackTable?.scrollTo(0, stackTable.scrollHeight);
}

const initialMachine = new Neander() as Machine;
const initialAssembler = new Assembler(initialMachine);

// Busy state handling
const showBusy = () => document.body.classList.add("is-busy");
const hideBusy = () => document.body.classList.remove("is-busy");

function App() {
  const [[machine, assembler], setState] = useState([initialMachine, initialAssembler]);
  const [errorMessages, setErrorMessages] = useState([] as string[]);

  let timeout: NodeJS.Timeout;

  useEffect(() => {
    scrollToFirstInstructionsRow();
    scrollToFirstDataRow();
    scrollToLastStackRow();

    hideBusy();
  }, [machine, assembler]);

  return (
    <div style={{ height: "calc(100vh - 32px)", display: "flex", margin: "16px", gap: "16px" }}>

      {/* Code area */}
      <div style={{ height: "100%", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Code editor */}
        <div style={{ border: "1px solid", flex: 1, overflow: "auto" }}>
          <CodeEditor machine={machine} />
        </div>

        {/* Error messages */}
        {(errorMessages.length > 0) && <div style={{ border: "1px solid", flex: 0.125, marginTop: "16px", overflow: "auto", padding: "4px" }}>
          {errorMessages.map((message, index) => {
            return <><text key={index}>{message}</text><br></br></>;
          })}
        </div>}

      </div>

      {/* Instructions memory area */}
      <table className="instructions-table" style={{ height: "100%", display: "block", overflowY: "scroll" }}>
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
            return <DataRow key={address} address={address} machine={machine} assembler={assembler} />;
          })}
        </tbody>
      </table>

      {/* Stack memory area */}
      {machine instanceof Volta && <table className="stack-table" style={{ height: "100%", display: "block", overflowY: "scroll" }}>
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
        <select className="hide-if-busy" value={machine.getName()} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          clearTimeout(timeout);

          function buildMachine(machineName: string): Machine {
            switch (machineName) {
              case "Neander": return new Neander();
              case "Ahmes": return new Ahmes();
              case "Ramses": return new Ramses();
              case "Cromag": return new Cromag();
              case "Queops": return new Queops();
              case "Pitagoras": return new Pitagoras();
              case "Pericles": return new Pericles();
              case "REG": return new Reg();
              case "Volta": return new Volta();
              default: throw new Error(`Invalid machine name: ${machineName}`);
            }
          }

          const newMachine = buildMachine(event.target.value);
          showBusy();
          setTimeout(() => {
            setState([newMachine, new Assembler(newMachine)]);
          });
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

        {/* Busy state */}
        <div className="show-if-busy" style={{ display: "flex", width: "100%", flex: 1, justifyContent: "center", alignItems: "center" }}>Loading...</div>

        {/* Flags */}
        {(machine.getFlags().length > 1) && (
          <fieldset className="hide-if-busy" style={{ paddingTop: "16px", paddingBottom: "16px" }}>
            <legend>Flags</legend>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
              {machine.getFlags().map((flag, index) => {
                return <FlagWidget key={index} name={flag.getName()} machine={machine} />;
              })}
            </div>
          </fieldset>
        )}

        {/* Registers */}
        <fieldset className="hide-if-busy" style={{ paddingTop: "32px", paddingBottom: "32px", overflow: "auto" }}>
          <legend>Registers</legend>
          <div style={{ display: "grid", justifyContent: "center", gridTemplateColumns: "112px 112px", justifyItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {machine.getRegisters().map((register, index) => {
              return <RegisterWidget key={index} name={register.getName()} machine={machine} />;
            })}
          </div>
        </fieldset>

        {/* Information */}
        <fieldset className="hide-if-busy" style={{ paddingTop: "16px", paddingBottom: "16px" }}>
          <Information machine={machine} />
        </fieldset>

        {/* Buttons */}
        <div className="hide-if-busy" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => {
            const sourceCode = window.codeMirrorInstance.getValue();
            machine.setRunning(false);
            setErrorMessages(assembler.build(sourceCode));
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

        {/* Separator */}
        <div className="hide-if-busy" style={{ flexGrow: 1 }} />

        {/* Instructions */}
        <fieldset className="hide-if-busy">
          <legend>Instructions</legend>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
            {machine.getInstructions().map((instruction, index) => {
              let assemblyFormat = [instruction.getMnemonic().toUpperCase(), ...instruction.getArguments()].join(" ");
              assemblyFormat = assemblyFormat.replace("a0", "a").replace("a1", "b");
              const isWide = (assemblyFormat.length > 7); // TODO: Revisit layout
              return <div style={{
                width: "56px", whiteSpace: "nowrap", fontFamily: "monospace",
                marginLeft: (isWide ? "0" : "16px"), marginRight: (isWide ? "16px" : "0")
              }} key={index}>
                {assemblyFormat}
              </div>;
            })}
          </div>
        </fieldset>

        {/* Addressing modes */}
        {(machine.getAddressingModes().length > 1) && (
          <fieldset className="hide-if-busy">
            <legend>Addressing modes</legend>
            <div style={{
              display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px",
              justifyContent: (machine.getAddressingModes().length > 2 ? "left" : "center")
            }}>
              {machine.getAddressingModes().map((addressingMode, index) => {
                return <div style={{ width: "56px", marginLeft: "16px", fontFamily: "monospace" }} key={index}>
                  {addressingMode.getAssemblyPattern().toUpperCase().replace("(.*)", "a") || "a"}
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
