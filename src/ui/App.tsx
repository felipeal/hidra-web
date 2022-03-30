import React, { ChangeEvent, useEffect, useState } from "react";
import codemirror from "codemirror";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

// Components
import CodeEditor, { hasBreakpointAtLine } from "./CodeEditor";
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
import { Texts } from "../core/Texts";
import { ErrorMessage } from "../core/Errors";
import { Menu, SubMenuCheckBox, SubMenuItem, SubMenuSeparator } from "./Menus";

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

export default function App() {
  const [[machine, assembler], setState] = useState([initialMachine, initialAssembler]);
  const [errorMessages, setErrorMessages] = useState([] as ErrorMessage[]);
  const [isRunning, setRunning] = useState(machine.isRunning());

  // Display toggles
  const [displayHex, setDisplayHex] = useState(false);
  const [displayNegative, setDisplayNegative] = useState(false);
  const [displayChars, setDisplayChars] = useState(false);
  const [displayFast, setDisplayFast] = useState(false);
  const [displayFollowPC, setDisplayFollowPC] = useState(true);

  const navBarHeightPx = 50;

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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/**********************************************************************
        * Navigation bar
        **********************************************************************/}

      <div className="navbar" style={{
        height: `${navBarHeightPx}px`, display: "flex", gap: "8px", alignItems: "center", paddingLeft: "16px", columnGap: "8px"
      }}>
        <span style={{ padding: "8px" }}>Hidra</span>
        <Menu title="Arquivo">
          <SubMenuItem title="Abrir" callback={() => {}}/>
          <SubMenuItem title="Salvar" callback={() => {}}/>
          <SubMenuSeparator/>
          <SubMenuItem title="Importar memória" callback={() => {}}/>
          <SubMenuItem title="Exportar memória" callback={() => {}}/>
        </Menu>
        <Menu title="Opções">
          <SubMenuCheckBox title="Hexadecimal" checked={displayHex} setChecked={setDisplayHex}/>
          <SubMenuCheckBox title="Interpretar negativos" checked={displayNegative} setChecked={setDisplayNegative}/>
          <SubMenuCheckBox title="Interpretar caracteres" checked={displayChars} setChecked={setDisplayChars}/>
          <SubMenuSeparator/>
          <SubMenuCheckBox title="Execução rápida" checked={displayFast} setChecked={setDisplayFast}/>
          <SubMenuCheckBox title="Execução segue cursor" checked={displayFollowPC} setChecked={setDisplayFollowPC}/>
        </Menu>
        <Menu title="Ajuda">
          <SubMenuItem title="Abrir exemplo" callback={() => {}}/>
          <SubMenuItem title="Atalhos de teclado" callback={() => {}}/>
          <SubMenuSeparator/>
          <SubMenuItem title="Sobre" callback={() => {}}/>
        </Menu>
      </div>

      <div style={{ height: `calc(100vh - 32px - ${navBarHeightPx}px)`, display: "flex", margin: "16px", gap: "16px" }}>

        {/********************************************************************
          * Left area (code editor and error messages)
          ********************************************************************/}

        <div style={{ height: "100%", flex: 1, display: "flex", flexDirection: "column", overflowX: "auto", minWidth: "20rem" }}>

          {/* Code editor */}
          <div className="code-editor" style={{ flex: 1, overflowY: "auto" }}>
            <CodeEditor machine={machine} assembler={assembler} />
          </div>

          {/* Error messages */}
          {(errorMessages.length > 0) && <div className="error-messages-area monospace-font" style={{ flex: 0.125, marginTop: "16px", overflow: "auto", padding: "4px" }}>
            {errorMessages.map((errorMessage, index) => {
              return <span className="error-message" key={index} onClick={() => {
                codeMirrorInstance.setSelection({ line: errorMessage.lineNumber - 1, ch: Infinity }, { line: errorMessage.lineNumber - 1, ch: 0 });
                codeMirrorInstance.focus();
              }}>{Texts.buildErrorMessageText(errorMessage)}<br /></span>;
            })}
          </div>}

        </div>

        {/********************************************************************
          * Middle area (memory tables)
          ********************************************************************/}

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
              return <MemoryRowInstructions key={address} address={address} machine={machine} assembler={assembler} />;
            })}
          </tbody>
        </table>

        {/* Data memory area */}
        <table className="data-table" style={{ height: "100%", display: "block", overflowY: "scroll", tableLayout: "fixed", minWidth: "10rem" }}>
          <thead>
            <tr>
              <th>End.</th>
              <th>Valor</th>
              {displayChars && <th>Car.</th>}
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {machine.getMemory().map((value, address) => {
              return <MemoryRowData key={address} address={address} machine={machine} assembler={assembler} displayChars={displayChars} />;
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
              {displayChars && <th>Car.</th>}
            </tr>
          </thead>
          <tbody>
            {machine.getStack().map((value, index) => {
              return <MemoryRowStack key={index} row={index} address={machine.getStack().length - 1 - index} voltaMachine={machine} displayChars={displayChars} />;
            })}
          </tbody>
        </table>}

        {/********************************************************************
          * Right area (machine)
          ********************************************************************/}

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
              setErrorMessages([]);
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
            <button className="machine-button" onClick={() => {
              const sourceCode = window.codeMirrorInstance.getValue();
              machine.setRunning(false);
              setErrorMessages(assembler.build(sourceCode));
              machine.updateInstructionStrings();
            }}>Montar</button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="machine-button" style={{ flex: 1 }} onClick={() => {
                machine.setRunning(false);
                machine.setPCValue(0);
                if (machine.hasRegister("SP")) {
                  machine.setRegisterValueByName("SP", 0);
                }
                machine.clearCounters();
              }}>Zerar PC</button>
              <button className="machine-button" style={{ flex: 1 }} onClick={() => {
                if (!machine.isRunning()) { // Run requested
                  machine.setRunning(true);
                  const nextStep = function () {
                    if (machine.isRunning()) {
                      machine.step();

                      if (hasBreakpointAtLine(assembler.getPCCorrespondingSourceLine())) {
                        machine.setRunning(false);
                      }

                      timeout = setTimeout(nextStep, 0);
                    } else {
                      machine.updateInstructionStrings();
                    }
                  };
                  nextStep();
                } else { // Stop requested
                  machine.setRunning(false);
                  machine.updateInstructionStrings();
                }
              }}>{isRunning ? "Parar" : "Rodar"}</button>
              <button className="machine-button" disabled={isRunning} style={{ flex: 1 }} onClick={() => {
                machine.step();
                machine.updateInstructionStrings();
              }}>Passo</button>
            </div>
          </div>

          {/* Separator */}
          <div className="hide-if-busy" style={{ minHeight: "16px", flexGrow: 1 }} />

          {/* Directives */}
          <fieldset className="hide-if-busy">
            <legend>Diretivas</legend>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
              {["org", "db", "dw", "dab/daw"].map((directive, index) => {
                const description = Texts.getDirectiveDescription(directive);
                return <div className="monospace-font" style={{
                  minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px", marginRight: "0"
                }} key={index}>
                  <Tippy className="tooltip" content={<span>
                    <strong>{description.name}</strong>
                    <p>{description.description}</p>
                    <p>{description.examples}</p>
                  </span>}>
                    <span>{Texts.shortenArguments(directive.toUpperCase())}</span>
                  </Tippy>
                </div>;
              })}
            </div>
          </fieldset>

          {/* Instructions */}
          <fieldset className="hide-if-busy">
            <legend>Instruções</legend>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
              {machine.getInstructions().map((instruction, index) => {
                const assemblyFormat = [instruction.getMnemonic().toUpperCase(), ...instruction.getArguments()].join(" ");
                const [name, description] = Texts.getInstructionDescription(instruction.getAssemblyFormat(), machine);
                return <div className="monospace-font" style={{
                  minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px", marginRight: "0"
                }} key={index}>
                  <Tippy className="tooltip" content={<span>
                    <strong>{name}</strong>
                    <p>{Texts.shortenArguments(description)}</p>
                  </span>}>
                    <span>{Texts.shortenArguments(assemblyFormat)}</span>
                  </Tippy>
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
                  const description = Texts.getAddressingModeDescription(addressingMode.getAddressingModeCode());
                  return <div key={index} className="monospace-font" style={{ width: "56px", marginLeft: "16px" }}>
                    <Tippy className="tooltip" content={<span>
                      <strong>{description.name}</strong>
                      <p>{description.format}</p>
                      <p>{description.description}</p>
                    </span>}>
                      <span>{addressingMode.getAssemblyPattern().toUpperCase().replace("(.*)", "a") || "a"}</span>
                    </Tippy>
                  </div>;
                })}
              </div>
            </fieldset>
          )}

          {/* Busy state */}
          <div className="show-if-busy" style={{ display: "flex", width: "100%", flex: 1, justifyContent: "center", alignItems: "center" }}>Inicializando...</div>

        </div>
      </div>
    </div>
  );
}
