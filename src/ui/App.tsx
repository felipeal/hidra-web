import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import codemirror from "codemirror";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import CodeEditor, { hasBreakpointAtLine } from "./CodeEditor";
import MemoryRowInstructions from "./MemoryRowInstructions";
import MemoryRowData from "./MemoryRowData";
import MemoryRowStack from "./MemoryRowStack";
import FlagWidget from "./FlagWidget";
import RegisterWidget from "./RegisterWidget";
import Information from "./Information";
import { Menu, SubMenuCheckBox, SubMenuItem, SubMenuSeparator } from "./Menus";

import { buildMachine, getMachineNames, resetPCAndSP } from "./utils/MachineUtils";
import { FileError, buildMachineBasedOnFileName, exportMemory, generateFileNameForMachine, importMemory } from "./utils/MachineFileUtils";
import { scrollToCurrentPCRow, scrollToFirstDataRow, scrollToLastStackRow, scrollToPCLineAndRow } from "./utils/ScrollHandler";

import { Machine } from "../core/Machine";
import { Neander } from "../core/machines/Neander";
import { Volta } from "../core/machines/Volta";
import { Assembler } from "../core/Assembler";
import { Texts } from "../core/Texts";
import { ErrorMessage } from "../core/AssemblerError";
import { range } from "../core/utils/FunctionUtils";

// Global pointer required for CodeMirror persistence between live-reloads
declare global {
  var codeMirrorInstance: codemirror.Editor; // eslint-disable-line no-var
}

window.onerror = function myErrorHandler(errorMessage) {
  alert(`Error: ${errorMessage}`);
  return false;
};

// Warn on tab close
window.onbeforeunload = function (event) {
  if (isSafeToDiscardSource()) {
    return null;
  }

  (event || window.event).returnValue = "";
  return "";
};

function isSafeToDiscardSource() {
  return codeMirrorInstance.isClean() || codeMirrorInstance.getValue().length === 0;
}

// Busy state handling
const showBusy = () => document.body.classList.add("is-busy");
const hideBusy = () => document.body.classList.remove("is-busy");

const initialMachine = new Neander() as Machine;
const initialAssembler = new Assembler(initialMachine);
const navBarHeightPx = 44;
const showWIP = false;

let timeout: NodeJS.Timeout;

export default function App({ firstRowsOnly }: { firstRowsOnly?: boolean } = { }) {
  const [[machine, assembler], setState] = useState([initialMachine, initialAssembler]);
  const [errorMessages, setErrorMessages] = useState([] as ErrorMessage[]);
  const [isRunning, setRunning] = useState(machine.isRunning());

  const openFileInput = useRef<HTMLInputElement | null>(null);
  const saveFileAnchor = useRef<HTMLAnchorElement | null>(null);
  const importMemoryInput = useRef<HTMLInputElement | null>(null);
  const exportMemoryAnchor = useRef<HTMLAnchorElement | null>(null);

  // Display toggles
  const [displayHex, setDisplayHex] = useState(false);
  const [displayNegative, setDisplayNegative] = useState(false);
  const [displayChars, setDisplayChars] = useState(false);
  const [displayFast, setDisplayFast] = useState(false);
  const [displayFollowPC, setDisplayFollowPC] = useState(true);
  const [displayWrap, setDisplayWrap] = useState(false);

  useEffect(() => {
    // Restore values on machine change
    setRunning(machine.isRunning());

    // Reset scroll positions
    scrollToCurrentPCRow(machine);
    scrollToFirstDataRow();
    scrollToLastStackRow();

    hideBusy();

    // Event subscriptions
    return machine.subscribeToEvent("RUNNING", (value) => setRunning(Boolean(value)));
  }, [machine, assembler]);

  useEffect(() => {
    // Event subscription to follow PC
    return machine.subscribeToEvent(`REG.${machine.getPCName()}`, () => {
      if (displayFollowPC) {
        scrollToPCLineAndRow(machine, assembler);
      }
    });
  }, [machine, assembler, displayFollowPC]);

  async function onFileOpened(event: ChangeEvent<HTMLInputElement>) {
    await loadFile(event.target.files?.[0]);
  }

  async function loadFile(file: File | null | undefined) {
    // Detect binary files
    if (file?.name.endsWith(".mem")) {
      await loadBinaryFile(file);
      return;
    }

    // Allow user to cancel
    if (!isSafeToDiscardSource() && !window.confirm("Descartar alterações?")) {
      return;
    }

    if (file) {
      const fileBuffer = await file.arrayBuffer();

      // Read file as UTF-8
      let source = new TextDecoder().decode(fileBuffer);

      // If invalid UTF-8, fall back to Windows-1252 (Latin-1) encoding
      if (/�/.test(source)) {
        source = new TextDecoder("windows-1252").decode(fileBuffer);
      }

      codeMirrorInstance.setValue(source);
      machine.setRunning(false);
      const newMachine = buildMachineBasedOnFileName(file.name, machine.getName());
      setState([newMachine, new Assembler(newMachine)]);

      codeMirrorInstance.markClean();
    }
  }

  async function onMemoryImported(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    await loadBinaryFile(file);
  }

  async function loadBinaryFile(file: File | undefined) {
    if (file) {
      try {
        const newMachine = await importMemory(file);
        setState([newMachine, new Assembler(newMachine)]);
      } catch (error: unknown) {
        if (error instanceof FileError) {
          showError(error.message);
        } else {
          throw error;
        }
      }
    }
  }

  function showError(errorMessage: string) {
    alert(errorMessage);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }} onDrop={async (event) => {
      event.preventDefault(); // Prevent file from being opened

      // Use DataTransferItemList interface to access the file(s)
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (event.dataTransfer.items[i].kind === "file") {
          const file = event.dataTransfer.items[i].getAsFile();
          await loadFile(file);
        }
      }
    }}>

      {/**********************************************************************
        * Navigation bar
        **********************************************************************/}

      <div className="navbar" style={{
        height: `${navBarHeightPx}px`, display: "flex", gap: "8px", alignItems: "center", padding: "0 16px", columnGap: "8px"
      }}>
        <span style={{ padding: "8px" }}>Hidra</span>
        <Menu title="Arquivo">
          <SubMenuItem title="Abrir" callback={() => {
            openFileInput.current?.click();
          }}/>
          <SubMenuItem title="Salvar" callback={() => {
            const sourceCode = window.codeMirrorInstance.getValue();
            const file = new Blob([sourceCode], { type: "plain-text" });
            if (saveFileAnchor!.current) {
              saveFileAnchor.current.href = URL.createObjectURL(file);
              saveFileAnchor.current.download = generateFileNameForMachine(machine);
              saveFileAnchor.current.click();
            }
          }}/>
          <SubMenuSeparator/>
          <SubMenuItem title="Importar memória" callback={() => {
            importMemoryInput.current?.click();
          }}/>
          <SubMenuItem title="Exportar memória" callback={() => {
            const memory = exportMemory(machine);
            const file = new Blob([memory], { type: "application/octet-stream" });
            if (exportMemoryAnchor!.current) {
              exportMemoryAnchor.current.href = URL.createObjectURL(file);
              exportMemoryAnchor.current.download = generateFileNameForMachine(machine, { isBinary: true });
              exportMemoryAnchor.current.click();
            }
          }}/>
        </Menu>
        <Menu title="Opções">
          <SubMenuCheckBox title="Exibir valores hexadecimais" checked={displayHex} setChecked={(checked) => {
            setDisplayHex(checked);
            if (checked) {
              setDisplayNegative(false);
            }
          }}/>
          <SubMenuCheckBox title="Interpretar dados negativos" checked={displayNegative} setChecked={(checked) => {
            setDisplayNegative(checked);
            if (checked) {
              setDisplayHex(false);
            }
          }}/>
          <SubMenuCheckBox title="Exibir coluna de caracteres" checked={displayChars} setChecked={setDisplayChars}/>
          <SubMenuSeparator/>
          <SubMenuCheckBox title="Execução rápida" checked={displayFast} setChecked={(checked) => {
            machine.setRunning(false);
            setDisplayFast(checked);
          }}/>
          <SubMenuCheckBox title="Tela segue execução" checked={displayFollowPC} setChecked={setDisplayFollowPC}/>
          {showWIP && <SubMenuCheckBox title="Quebra de linha" checked={displayWrap} setChecked={setDisplayWrap}/>}
        </Menu>
        <div style={{ flex: 1 }}/>
        <a href="https://github.com/felipeal/hidra-web" target="_blank" rel="noreferrer" className="navbar-item" style={{
          padding: "8px", textDecoration: "unset"
        }}>GitHub</a>
      </div>

      <div style={{ height: `calc(100vh - 32px - ${navBarHeightPx}px)`, display: "flex", margin: "16px", gap: "16px" }}>

        {/********************************************************************
          * Left area (code editor and error messages)
          ********************************************************************/}

        <div style={{ height: "100%", flex: 1, display: "flex", flexDirection: "column", overflowX: "auto", minWidth: "20rem" }}>

          {/* Code editor */}
          <div className="code-editor" style={{ flex: 1, overflowY: "auto" }}>
            <CodeEditor machine={machine} assembler={assembler} displayWrap={displayWrap} />
          </div>

          {/* Error messages */}
          {(errorMessages.length > 0) && <div className="error-messages-area monospace-font" style={{
            flex: 0.125, marginTop: "16px", overflow: "auto", padding: "4px"
          }}>
            {errorMessages.map((errorMessage, index) => {
              return <span className="error-message" key={index} onClick={() => {
                codeMirrorInstance.setSelection({ line: errorMessage.lineNumber - 1, ch: Infinity }, { line: errorMessage.lineNumber - 1, ch: 0 });
                codeMirrorInstance.focus();
              }}>{Texts.buildErrorMessageText(errorMessage)}<br /></span>;
            })}
          </div>}

        </div>

        {/********************************************************************
          * Middle area (machine)
          ********************************************************************/}

        <div style={{ width: "360px", minWidth: "360px", display: "inline-flex", flexDirection: "column", overflowY: "auto" }}>

          {/* Machine select */}
          <select className="hide-if-busy" value={machine.getName()} data-testid="machine-select" onChange={
            (event: ChangeEvent<HTMLSelectElement>) => {
              machine.setRunning(false);
              clearTimeout(timeout);

              const newMachine = buildMachine(event.target.value);

              showBusy();
              setTimeout(() => {
                setErrorMessages([]);
                setState([newMachine, new Assembler(newMachine)]);
              });
            }
          }>
            {getMachineNames().map((name, index) => {
              return <option key={index} value={name}>{name}</option>;
            })}
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
            <div style={{
              display: "grid", justifyContent: "center", gridTemplateColumns: "112px 112px", justifyItems: "center", gap: "16px", flexWrap: "wrap"
            }}>
              {machine.getRegisters().map((register, index) => {
                return <RegisterWidget key={index} name={register.getName()} machine={machine} displayHex={displayHex} displayNegative={displayNegative} />;
              })}
            </div>
          </fieldset>

          {/* Information */}
          <fieldset className="hide-if-busy" style={{ marginTop: "16px", marginBottom: "16px", paddingTop: "16px", paddingBottom: "16px" }}>
            <Information machine={machine} />
          </fieldset>

          {/* Machine buttons */}
          <div className="hide-if-busy" style={{ display: "flex", gap: "8px" }}>
            <button className="machine-button" style={{ flex: 1 }} data-testid="reset-pc-button" onClick={() => {
              resetPCAndSP(machine);
            }}>Zerar PC</button>
            <button className="machine-button" style={{ flex: 1 }} data-testid="run-button" onClick={() => {
              if (!machine.isRunning()) { // Run requested
                machine.setRunning(true);
                const nextStep = function () {
                  if (machine.isRunning()) {
                    let numUpdates = displayFast ? 100 : 1;
                    while (machine.isRunning() && numUpdates--) {
                      machine.step();
                      if (hasBreakpointAtLine(assembler.getPCCorrespondingSourceLine())) {
                        machine.setRunning(false);
                      }
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
            <button className="machine-button" disabled={isRunning} style={{ flex: 1 }} data-testid="step-button" onClick={() => {
              machine.step();
              machine.updateInstructionStrings();
            }}>Passo</button>
          </div>

          {/* Spacer */}
          <div className="hide-if-busy" style={{ minHeight: "16px", flexGrow: 1 }} />

          {/* Build button */}
          <button className="hide-if-busy build-button" data-testid="build-button" onClick={() => {
            const sourceCode = window.codeMirrorInstance.getValue();
            machine.setRunning(false);
            setErrorMessages(assembler.build(sourceCode));
            machine.updateInstructionStrings();
          }}>Montar</button>

          {/* Directives */}
          <fieldset className="hide-if-busy">
            <legend>Diretivas</legend>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
              {["org", "db", "dw", "dab/daw"].map((directive, index) => {
                const description = Texts.getDirectiveDescription(directive);
                return <div className="monospace-font" style={{ minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px" }} key={index}>
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
                return <div className="monospace-font" style={{ minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px" }} key={index}>
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
                  const description = Texts.getAddressingModeDescription(addressingMode.getAddressingModeCode(), machine);
                  return <div key={index} className="monospace-font" style={{ width: "56px", marginLeft: "16px" }}>
                    <Tippy className="tooltip" content={<span>
                      <strong>{description.name}</strong>
                      <p>{description.description}</p>
                      <p>{description.examples}</p>
                    </span>}>
                      <span>{addressingMode.getAssemblyPattern().toUpperCase().replace("(.*)", "a") || "a"}</span>
                    </Tippy>
                  </div>;
                })}
              </div>
            </fieldset>
          )}

          {/* Busy state */}
          <div className="show-if-busy" style={{
            display: "flex", width: "100%", flex: 1, justifyContent: "center", alignItems: "center"
          }}>Inicializando...</div>

          {/* File loaders (not visible) */}
          <input type="file" ref={openFileInput} style={{ display: "none" }} data-testid="open-file-input" onChange={onFileOpened} />
          <a ref={saveFileAnchor} style={{ display: "none" }} data-testid="save-file-anchor" />
          <input type="file" ref={importMemoryInput} style={{ display: "none" }} data-testid="import-memory-input" onChange={onMemoryImported} />
          <a ref={exportMemoryAnchor} style={{ display: "none" }} data-testid="export-memory-anchor"/>

        </div>

        {/********************************************************************
          * Right area (memory tables)
          ********************************************************************/}

        {/* Instructions memory area */}
        <table className="instructions-table" data-testid="instructions-table" style={{
          height: "100%", display: "block", overflowY: "scroll", minWidth: "10rem"
        }}>
          <thead>
            <tr>
              <th>PC</th>
              <th>End.</th>
              <th>Valor</th>
              <th>Instrução</th>
            </tr>
          </thead>
          <tbody>
            {range(firstRowsOnly ? 8 : machine.getMemorySize()).map((address) => {
              return <MemoryRowInstructions key={address} address={address} machine={machine} assembler={assembler} displayHex={displayHex} />;
            })}
          </tbody>
        </table>

        {/* Data memory area */}
        <table className="data-table" data-testid="data-table" style={{
          height: "100%", display: "block", overflowY: "scroll", tableLayout: "fixed", minWidth: "10rem"
        }}>
          <thead>
            <tr>
              <th>End.</th>
              <th>Dado</th>
              {displayChars && <th>Car.</th>}
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {range(firstRowsOnly ? 8 : machine.getMemorySize()).map((address) => {
              return <MemoryRowData key={address} address={address} machine={machine} assembler={assembler}
                displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars}
              />;
            })}
          </tbody>
        </table>

        {/* Stack memory area */}
        {machine instanceof Volta && <table className="stack-table" data-testid="stack-table" style={{
          height: "100%", display: "block", overflowY: "scroll", minWidth: "8rem"
        }}>
          <thead>
            <tr>
              <th>SP</th>
              <th>End.</th>
              <th>Dado</th>
              {displayChars && <th>Car.</th>}
            </tr>
          </thead>
          <tbody>
            {machine.getStack().map((value, index) => {
              return <MemoryRowStack key={index} row={index} address={machine.getStack().length - 1 - index} voltaMachine={machine}
                displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars}
              />;
            })}
          </tbody>
        </table>}

      </div>
    </div>
  );
}
