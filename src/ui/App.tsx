import React, { ChangeEvent, useEffect, useState } from "react";
import codemirror from "codemirror";

// Components
import CodeEditor from "./CodeEditor";
import MemoryRowInstructions from "./MemoryRowInstructions";
import MemoryRowData from "./MemoryRowData";
import MemoryRowStack from "./MemoryRowStack";
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

let timeout: NodeJS.Timeout;

function App() {
  const [[machine, assembler], setState] = useState([initialMachine, initialAssembler]);
  const [errorMessages, setErrorMessages] = useState([] as string[]);
  const [isRunning, setRunning] = useState(machine.isRunning());

  useEffect(() => {
    // Restore values on machine change
    setRunning(machine.isRunning());

    // Event subscriptions
    machine.subscribeToEvent("RUNNING", (value) => setRunning(Boolean(value)));
  }, [machine]);

  useEffect(() => {
    scrollToFirstInstructionsRow();
    scrollToFirstDataRow();
    scrollToLastStackRow();

    hideBusy();
  }, [machine, assembler]);

  return (
    <div style={{ height: "calc(100vh - 32px)", display: "flex", margin: "16px", gap: "16px" }}>

      {/**********************************************************************
        * Left area (code editor and error messages)
        **********************************************************************/}

      <div style={{ height: "100%", flex: 1, display: "flex", flexDirection: "column", overflowX: "auto", minWidth: "20rem" }}>

        {/* Code editor */}
        <div className="code-editor" style={{ flex: 1, overflowY: "auto" }}>
          <CodeEditor machine={machine} />
        </div>

        {/* Error messages */}
        {(errorMessages.length > 0) && <div className="error-messages monospace-font" style={{ flex: 0.125, marginTop: "16px", overflow: "auto", padding: "4px" }}>
          {errorMessages.map((message, index) => {
            return <><text className="error-message" key={index}>{message}</text><br></br></>;
          })}
        </div>}

      </div>

      {/**********************************************************************
        * Middle area (memory tables)
        **********************************************************************/}

      {/* Instructions memory area */}
      <table className="instructions-table" style={{ height: "100%", display: "block", overflowY: "scroll", minWidth: "10rem" }}>
        <thead>
          <tr>
            <th>PC</th>
            <th>End.</th>
            <th>Valor</th>
            <th>Instrução</th>
          </tr>
        </thead>
        <tbody>
          {machine.getMemory().map((value, address) => {
            return <MemoryRowInstructions key={address} address={address} machine={machine} />;
          })}
        </tbody>
      </table>

      {/* Data memory area */}
      <table className="data-table" style={{ height: "100%", display: "block", overflowY: "scroll", tableLayout: "fixed", minWidth: "10rem" }}>
        <thead>
          <tr>
            <th>End.</th>
            <th>Valor</th>
            <th>Label</th>
          </tr>
        </thead>
        <tbody>
          {machine.getMemory().map((value, address) => {
            return <MemoryRowData key={address} address={address} machine={machine} assembler={assembler} />;
          })}
        </tbody>
      </table>

      {/* Stack memory area */}
      {machine instanceof Volta && <table className="stack-table" style={{ height: "100%", display: "block", overflowY: "scroll", minWidth: "8rem" }}>
        <thead>
          <tr>
            <th>SP</th>
            <th>End.</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {machine.getStack().map((value, index) => {
            return <MemoryRowStack key={index} address={machine.getStack().length - 1 - index} voltaMachine={machine} />;
          })}
        </tbody>
      </table>}

      {/**********************************************************************
        * Right area (machine)
        **********************************************************************/}

      <div style={{ width: "360px", minWidth: "360px", display: "inline-flex", flexDirection: "column", overflowY: "auto" }}>

        {/* Machine select */}
        <select className="hide-if-busy" value={machine.getName()} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          machine.setRunning(false);
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
          <legend>Registradores</legend>
          <div style={{ display: "grid", justifyContent: "center", gridTemplateColumns: "112px 112px", justifyItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {machine.getRegisters().map((register, index) => {
              return <RegisterWidget key={index} name={register.getName()} machine={machine} />;
            })}
          </div>
        </fieldset>

        {/* Information */}
        <fieldset className="hide-if-busy" style={{ marginTop: "16px", marginBottom: "16px", paddingTop: "16px", paddingBottom: "16px" }}>
          <Information machine={machine} />
        </fieldset>

        {/* Buttons */}
        <div className="hide-if-busy" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => {
            const sourceCode = window.codeMirrorInstance.getValue();
            machine.setRunning(false);
            setErrorMessages(assembler.build(sourceCode));
            machine.updateInstructionStrings();
          }}>Montar</button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ flex: 1 }} onClick={() => {
              machine.setRunning(false);
              machine.setPCValue(0);
              if (machine.hasRegister("SP")) {
                machine.setRegisterValueByName("SP", 0);
              }
              machine.clearCounters();
            }}>Zerar PC</button>
            <button style={{ flex: 1 }} onClick={() => {
              machine.setRunning(!machine.isRunning());
              const nextStep = function () {
                if (machine.isRunning()) {
                  machine.step();
                  timeout = setTimeout(nextStep, 10);
                }
              };
              nextStep();
            }}>{isRunning ? "Parar" : "Rodar"}</button>
            <button disabled={isRunning} style={{ flex: 1 }} onClick={() => {
              machine.step();
            }}>Passo</button>
          </div>
        </div>

        {/* Separator */}
        <div className="hide-if-busy" style={{ minHeight: "16px", flexGrow: 1 }} />

        {/* Instructions */}
        <fieldset className="hide-if-busy">
          <legend>Instruções</legend>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
            {machine.getInstructions().map((instruction, index) => {
              let assemblyFormat = [instruction.getMnemonic().toUpperCase(), ...instruction.getArguments()].join(" ");
              assemblyFormat = assemblyFormat.replace("a0", "a").replace("a1", "b");
              return <div className="monospace-font" style={{
                minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px", marginRight: "0"
              }} key={index}>
                {assemblyFormat}
              </div>;
            })}
          </div>
        </fieldset>

        {/* Addressing modes */}
        {(machine.getAddressingModes().length > 1) && (
          <fieldset className="hide-if-busy">
            <legend>Modos de end.</legend>
            <div style={{
              display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px"
            }}>
              {machine.getAddressingModes().map((addressingMode, index) => {
                return <div className="monospace-font" style={{ width: "56px", marginLeft: "16px" }} key={index}>
                  {addressingMode.getAssemblyPattern().toUpperCase().replace("(.*)", "a") || "a"}
                </div>;
              })}
            </div>
          </fieldset>
        )}

        {/* Busy state */}
        <div className="show-if-busy" style={{ display: "flex", width: "100%", flex: 1, justifyContent: "center", alignItems: "center" }}>Inicializando...</div>

      </div>
    </div>
  );
}

export default App;
