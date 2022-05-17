import React, { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import useScrollbarSize from "react-scrollbar-size";
import codemirror from "codemirror";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import CodeEditor, { hasBreakpointAtLine } from "./CodeEditor";
import { MemoryInstructions, MemoryInstructionsForMeasurements } from "./MemoryInstructions";
import { MemoryData, MemoryDataForMeasurements } from "./MemoryData";
import { MemoryStack, MemoryStackForMeasurements } from "./MemoryStack";
import FlagWidget from "./FlagWidget";
import RegisterWidget from "./RegisterWidget";
import Information from "./Information";
import CesarDisplay from "./CesarDisplay";
import { Menu, SubMenuCheckBox, SubMenuItem, SubMenuSeparator } from "./Menus";

import { buildMachine, getMachineNames, resetPCAndSP } from "./utils/MachineUtils";
import { calculateTableDimensions as measureTableDimensions, TableDimensions, toPx } from "./utils/LayoutUtils";
import {
  FileError, buildAssemblerBasedOnMachine, buildMachineBasedOnFileName, exportMemory, generateFileNameForMachine, importMemory
} from "./utils/MachineFileUtils";

import { Machine } from "../core/Machine";
import { Neander } from "../core/machines/Neander";
import { Volta } from "../core/machines/Volta";
import { Assembler } from "../core/Assembler";
import { Texts } from "../core/Texts";
import { ErrorMessage } from "../core/AssemblerError";
import { rethrowUnless } from "../core/utils/FunctionUtils";
import { Cesar } from "../core/machines/Cesar";

declare global {
  // Required for CodeMirror persistence between live-reloads
  var codeMirrorInstance: codemirror.Editor; // eslint-disable-line no-var
}

window.onerror = (errorMessage) => {
  alert(errorMessage);
  return false;
};

// Warn on tab close
window.onbeforeunload = (event) => {
  if (isSafeToDiscardSource()) {
    return null;
  }

  (event || window.event).returnValue = "";
  return "";
};

function isSafeToDiscardSource() {
  // Very short sources are considered safe to discard
  return codeMirrorInstance.isClean() || codeMirrorInstance.getValue().length < 10;
}

// Busy state handling
const showBusy = () => document.body.classList.add("is-busy");
const hideBusy = () => document.body.classList.remove("is-busy");

const navBarHeightPx = 44;
const showWIP = false;

let timeout: NodeJS.Timeout;

function initialState(): [Machine, Assembler] {
  const initialMachine = new Neander() as Machine;
  const initialAssembler = buildAssemblerBasedOnMachine(initialMachine);
  return [initialMachine, initialAssembler];
}

export default function App() {
  const [[machine, assembler], setState] = useState(initialState());
  const [errorMessages, setErrorMessages] = useState([] as ErrorMessage[]);
  const [isRunning, setRunning] = useState(machine.isRunning());

  // Display toggles
  const [displayHex, setDisplayHex] = useState(false);
  const [displayNegative, setDisplayNegative] = useState(false);
  const [displayChars, setDisplayChars] = useState(false);
  const [displayFollowPC, setDisplayFollowPC] = useState(true);
  const [displayWrap, setDisplayWrap] = useState(false);

  useEffect(() => {
    // Restore values on machine change
    setRunning(machine.isRunning());

    hideBusy();

    // Event subscriptions
    return machine.subscribeToEvent("RUNNING", (value) => setRunning(Boolean(value)));
  }, [machine, assembler]);

  /****************************************************************************
   * File load/save
   ****************************************************************************/

  const openFileInput = useRef<HTMLInputElement | null>(null);
  const saveFileAnchor = useRef<HTMLAnchorElement | null>(null);
  const importMemoryInput = useRef<HTMLInputElement | null>(null);
  const exportMemoryAnchor = useRef<HTMLAnchorElement | null>(null);

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
      setState([newMachine, buildAssemblerBasedOnMachine(newMachine)]);

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
        setState([newMachine, buildAssemblerBasedOnMachine(newMachine)]);
      } catch (error: unknown) {
        rethrowUnless(error instanceof FileError, error);
        showError(error.message);
      }
    }
  }

  function showError(errorMessage: string) {
    alert(errorMessage);
  }

  /****************************************************************************
   * Cesar keyboard handling
   ****************************************************************************/

  function keyToNumber(key: string): number | null {
    const charCode = key.charCodeAt(0);

    if (key === "Backspace") {
      return 8;
    } else if (key === "Enter") {
      return 13;
    } else if (key.length === 1 && charCode >= 32 && charCode <= 126) {
      return charCode;
    } else {
      return null;
    }
  }

  function handleCesarKeyEvent(event: KeyboardEvent) {
    // Ignore key combinations
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const keyNumber = keyToNumber(event.key);
    if (keyNumber !== null) {
      machine.setMemoryValue(Cesar.KEYBOARD_BUFFER_ADDRESS, keyNumber);
      machine.setMemoryValue(Cesar.KEYBOARD_STATUS_ADDRESS, Cesar.KEYBOARD_STATUS_KEY_PRESSED);
    }
  }

  function enableCesarKeyListener() {
    codeMirrorInstance.setOption("readOnly", true);
    document.addEventListener("keydown", handleCesarKeyEvent);
  }

  function disableCesarKeyListener() {
    codeMirrorInstance.setOption("readOnly", false);
    document.removeEventListener("keydown", handleCesarKeyEvent);
  }

  /****************************************************************************
   * Layout measurements
   ****************************************************************************/

  const isCesar = (machine.getName() === "Cesar");

  const { width: scrollbarWidth } = useScrollbarSize();

  const [instructionsDimensions, setInstructionsDimensions] = useState<TableDimensions | null>(null);
  const instructionsHeaderRef = useRef<HTMLDivElement>(null);
  const instructionsBodyRef = useRef<HTMLDivElement>(null);

  const [dataDimensions, setDataDimensions] = useState<TableDimensions | null>(null);
  const dataHeaderRef = useRef<HTMLDivElement>(null);
  const dataBodyRef = useRef<HTMLDivElement>(null);

  const [stackDimensions, setStackDimensions] = useState<TableDimensions | null>(null);
  const stackHeaderRef = useRef<HTMLDivElement>(null);
  const stackBodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!instructionsDimensions && instructionsHeaderRef.current && instructionsBodyRef.current) {
      setInstructionsDimensions(measureTableDimensions(instructionsHeaderRef.current, instructionsBodyRef.current));
    }
    if (!dataDimensions && dataHeaderRef.current && dataBodyRef.current) {
      setDataDimensions(measureTableDimensions(dataHeaderRef.current, dataBodyRef.current));
    }
    if (!stackDimensions && stackHeaderRef.current && stackBodyRef.current) {
      setStackDimensions(measureTableDimensions(stackHeaderRef.current, stackBodyRef.current));
    }
  }, [instructionsDimensions, dataDimensions, stackDimensions]);

  // Render fake tables with the widest texts possible for measuring purposes
  if (!instructionsDimensions || !dataDimensions || !stackDimensions) {
    return <div style={{ display: "block" }}>
      <MemoryInstructionsForMeasurements headerRef={instructionsHeaderRef} bodyRef={instructionsBodyRef} />
      <MemoryDataForMeasurements headerRef={dataHeaderRef} bodyRef={dataBodyRef} />
      <MemoryStackForMeasurements headerRef={stackHeaderRef} bodyRef={stackBodyRef} />
    </div>;
  }

  /****************************************************************************
   * Main render
   ****************************************************************************/

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }} onDrop={async (event) => {
      event.preventDefault(); // Prevent file from being opened

      // Use DataTransferItemList interface to access the file
      if (event.dataTransfer.items[0]?.kind === "file") {
        const file = event.dataTransfer.items[0].getAsFile();
        await loadFile(file);
      }
    }}>

      {/**********************************************************************
        * Navigation bar
        **********************************************************************/}

      <div className="navbar" style={{
        height: toPx(navBarHeightPx), display: "flex", gap: "8px", alignItems: "center", padding: "0 16px", columnGap: "8px"
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
          <SubMenuCheckBox title="Tela segue execução" checked={displayFollowPC} setChecked={setDisplayFollowPC}/>
          {showWIP && <SubMenuCheckBox title="Quebra de linha" checked={displayWrap} setChecked={setDisplayWrap}/>}
        </Menu>
        <div style={{ flex: 1 }}/>
        <a href="https://github.com/felipeal/hidra-web" target="_blank" rel="noreferrer" className="navbar-item" style={{
          padding: "8px", textDecoration: "unset"
        }}>GitHub</a>
      </div>

      <div style={{ height: `calc(100vh - 32px - ${navBarHeightPx}px)`, display: "flex", padding: "16px", gap: "16px", overflow: "auto" }}>

        {/********************************************************************
          * Left area (code editor and error messages)
          ********************************************************************/}

        <div style={{ height: "100%", flex: 1, display: "flex", flexDirection: "column", overflowX: "auto", minWidth: "20rem" }}>

          {/* Code editor */}
          <div className="code-editor" style={{ flex: 1, overflowY: "auto" }}>
            <CodeEditor machine={machine} assembler={assembler} displayFollowPC={displayFollowPC} displayWrap={displayWrap} />
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

        <div style={{ width: (isCesar ? "510px" : "360px"), display: "inline-flex", flexShrink: 0, flexDirection: "column", overflowY: "auto" }}>

          {/* Machine select */}
          <select className="hide-if-busy" value={machine.getName()} data-testid="machine-select" onChange={
            (event: ChangeEvent<HTMLSelectElement>) => {
              machine.setRunning(false);
              clearTimeout(timeout);

              const newMachine = buildMachine(event.target.value);

              showBusy();
              setTimeout(() => {
                setErrorMessages([]);
                setState([newMachine, buildAssemblerBasedOnMachine(newMachine)]);
              });
            }
          }>
            {getMachineNames().map((name, index) => {
              return <option key={index} value={name}>{name}</option>;
            })}
          </select>

          {/* Flags */}
          {(machine.getFlags().length > 1) && (
            <fieldset className="hide-if-busy" style={{ paddingTop: (isCesar ? "8px" : "16px"), paddingBottom: (isCesar ? "8px" : "16px") }}>
              <legend>Flags</legend>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                {machine.getFlags().map((flag, index) => {
                  return <FlagWidget key={index} name={flag.getName()} machine={machine} />;
                })}
              </div>
            </fieldset>
          )}

          {/* Registers */}
          <fieldset className="hide-if-busy" style={{ paddingTop: (isCesar ? "16px" : "32px"), paddingBottom: (isCesar ? "16px" : "32px"), overflow: "auto" }}>
            <legend>Registradores</legend>
            <div style={{
              display: "grid", gridTemplateColumns: (isCesar ? "100px 100px 100px 100px" : "112px 112px"),
              justifyContent: "center", justifyItems: "center", gap: "16px", flexWrap: "wrap"
            }}>
              {machine.getRegisters().map((register, index) => {
                return <RegisterWidget key={index} name={register.getName()} machine={machine} displayHex={displayHex} displayNegative={displayNegative} />;
              })}
            </div>
          </fieldset>

          {/* Display */}
          {isCesar && <fieldset className="hide-if-busy">
            <legend>Display</legend>
            <CesarDisplay machine={machine}/>
          </fieldset>}

          {/* Information */}
          <fieldset className="hide-if-busy" style={{ marginTop: "16px", padding: (isCesar ? "12px 0" : "16px 0") }}>
            <Information machine={machine} keyboardOn={isCesar ? isRunning : null} />
          </fieldset>

          {/* Machine buttons */}
          <div className="hide-if-busy" style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <button className="machine-button" style={{ flex: 1 }} data-testid="reset-pc-button" onClick={() => {
              resetPCAndSP(machine);
            }}>Zerar PC</button>
            <button className="machine-button" style={{ flex: 1 }} data-testid="run-button" onClick={() => {
              if (!machine.isRunning()) { // Run requested
                machine.setRunning(true);
                isCesar && enableCesarKeyListener();
                const nextStep = function () {
                  if (machine.isRunning()) {
                    machine.step();
                    if (hasBreakpointAtLine(assembler.getPCCorrespondingSourceLine())) {
                      machine.setRunning(false);
                    }
                    timeout = setTimeout(nextStep, 0);
                  } else {
                    machine.updateInstructionStrings();
                    isCesar && disableCesarKeyListener();
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
            const errorMessages = assembler.build(sourceCode);
            setErrorMessages(errorMessages);
            if (errorMessages.length === 0) {
              machine.updateInstructionStrings();
            }
          }}>Montar</button>

          {/* Directives */}
          <fieldset className="hide-if-busy">
            <legend>Diretivas</legend>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", marginBottom: "4px" }}>
              {(isCesar ? ["org", "db", "dw", "dab", "daw"] : ["org", "db", "dw", "dab/daw"]).map((directive, index) => {
                const description = Texts.getDirectiveDescription(directive, machine);
                return <div className="monospace-font" style={{ minWidth: "56px", whiteSpace: "nowrap", marginLeft: "16px" }} key={index}>
                  <Tippy className="tooltip" content={<span>
                    <strong>{description.name}</strong>
                    {description.description.split("\n").map((line, index) => <p key={index}>{line}</p>)}
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
                const assemblyFormat = [instruction.getMnemonic().toUpperCase(), ...instruction.getParameters()].join(" ");
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
                      <span>{addressingMode.getAssemblyPattern() || "a"}</span>
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

        {/* Instructions memory */}
        <MemoryInstructions dimensions={instructionsDimensions} scrollbarWidth={scrollbarWidth} machine={machine} assembler={assembler}
          displayHex={displayHex} displayNegative={displayNegative} displayFollowPC={displayFollowPC} />

        {/* Data memory */}
        <MemoryData dimensions={dataDimensions} scrollbarWidth={scrollbarWidth} machine={machine} assembler={assembler}
          displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars} />

        {/* Stack memory */}
        {machine instanceof Volta && <MemoryStack dimensions={stackDimensions} scrollbarWidth={scrollbarWidth} machine={machine}
          displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars} displayFollowPC={displayFollowPC} />}

      </div>

    </div>
  );
}
