import { } from "./utils/jsdomSetup";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../ui/App";
import { getSelectedMachine, mockDropEvent, runPendingTimers, setSourceCode } from "./utils/AppTestFunctions";
import { mockBinaryFile, mockTextFile } from "./utils/MockFile";

async function uploadFile(file: File, inputTestId: string) {
  await act(async () => {
    userEvent.upload(screen.getByTestId(inputTestId), file);
  });
}

async function openFileFromBytes(fileName: string, arrayBuffer: Uint8Array) {
  await uploadFile(mockBinaryFile(fileName, arrayBuffer), "open-file-input");
}

async function openFileFromString(fileName: string, utf8Text: string) {
  await uploadFile(mockTextFile(fileName, utf8Text), "open-file-input");
}

async function importMemory(fileName: string, arrayBuffer: Uint8Array) {
  await uploadFile(mockBinaryFile(fileName, arrayBuffer), "import-memory-input");
}

function buildRamsesMemoryFile(): Uint8Array {
  const ramsesIdentifier = [0x03, 0x52, 0x4D, 0x53]; // 3RMS
  const instructions = [0x20, 0, 0x80, 0]; // LDR A 128
  const padding = new Array(512 - 4).fill(0);
  return new Uint8Array([...ramsesIdentifier, ...instructions, ...padding]);
}

describe("File Actions", () => {

  beforeEach(() => {
    render(<App/>);
    setSourceCode("");
    global.URL.createObjectURL = jest.fn().mockReturnValue("#blob-url");
  });

  afterEach(() => {
    runPendingTimers();
  });

  /****************************************************************************
   * File -> Open
   ****************************************************************************/

  test("open: should load utf-8 source file and auto-switch to correct machine", async () => {
    // Click menu entry
    jest.spyOn(screen.getByTestId("open-file-input"), "click");
    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Abrir"));
    expect(screen.getByTestId("open-file-input").click).toHaveBeenCalled();

    const expectedSource = "add 128\n; áéíóú";

    await openFileFromString("file.rad", expectedSource);

    expect(getSelectedMachine()).toBe("Ramses");
    expect(codeMirrorInstance.getValue()).toBe(expectedSource);
  });

  test("open: should auto-convert windows-1252 files", async () => {
    const expectedSource = "áéíóú";
    const windows1252EncodedSource = new Uint8Array([0xE1, 0xE9, 0xED, 0xF3, 0xFA]);

    await openFileFromBytes("file.ahd", windows1252EncodedSource);

    expect(codeMirrorInstance.getValue()).toBe(expectedSource);
  });

  test("open: should warn in case there are unsaved changes", async () => {
    codeMirrorInstance.setValue("unsaved source code");

    // User cancels
    jest.spyOn(global, "confirm").mockReturnValueOnce(false);
    await openFileFromString("file.rad", "replaced");
    expect(global.confirm).toHaveBeenCalled();
    expect(codeMirrorInstance.getValue()).toBe("unsaved source code");

    // User confirms
    jest.spyOn(global, "confirm").mockReturnValueOnce(true);
    await openFileFromString("file.rad", "replaced");
    expect(global.confirm).toHaveBeenCalled();
    expect(codeMirrorInstance.getValue()).toBe("replaced");
  });

  test("open: should accept memory files", async () => {
    await openFileFromBytes("file.mem", buildRamsesMemoryFile());

    expect(getSelectedMachine()).toBe("Ramses");
    expect(screen.getByText("LDR A 128")).toBeInTheDocument();
  });

  /****************************************************************************
   * File -> Save
   ****************************************************************************/

  test("save: should download file", () => {
    jest.spyOn(screen.getByTestId("save-file-anchor"), "click").mockImplementationOnce(jest.fn());

    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Salvar"));

    const extensionRegEx = /\.ned$/;
    expect(screen.getByTestId<HTMLAnchorElement>("save-file-anchor").download).toMatch(extensionRegEx);
    expect(screen.getByTestId<HTMLAnchorElement>("save-file-anchor").href).toMatch(/#blob-url/);
    expect(screen.getByTestId("save-file-anchor").click).toHaveBeenCalled();
  });

  /****************************************************************************
   * File -> Import memory
   ****************************************************************************/

  test("import memory: should import in the correct machine", async () => {
    // Click menu entry
    jest.spyOn(screen.getByTestId("import-memory-input"), "click");
    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Importar memória"));
    expect(screen.getByTestId("import-memory-input").click).toHaveBeenCalled();

    await importMemory("file.mem", buildRamsesMemoryFile());

    expect(getSelectedMachine()).toBe("Ramses");
    expect(screen.getByText("LDR A 128")).toBeInTheDocument();
  });

  test("import memory: should show error if the file is invalid", async () => {
    jest.spyOn(window, "alert").mockImplementationOnce(jest.fn());
    await importMemory("file.mem", new Uint8Array([]));
    expect(window.alert).toHaveBeenCalled();
  });

  /****************************************************************************
   * File -> Export memory
   ****************************************************************************/

  test("export memory: should download file", () => {
    jest.spyOn(screen.getByTestId("export-memory-anchor"), "click").mockImplementationOnce(jest.fn());

    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Exportar memória"));

    const extensionRegEx = /\.mem$/;
    expect(screen.getByTestId<HTMLAnchorElement>("export-memory-anchor").download).toMatch(extensionRegEx);
    expect(screen.getByTestId<HTMLAnchorElement>("export-memory-anchor").href).toMatch(/#blob-url/);
  });

  /****************************************************************************
   * Keyboard shortcuts
   ****************************************************************************/

  test("open shortcut: should show open dialog", async () => {
    jest.spyOn(screen.getByTestId("open-file-input"), "click");
    userEvent.keyboard("{Control>}o{/Control}"); // Control + lowercase
    userEvent.keyboard("{Control>}O{/Control}"); // Control + uppercase
    userEvent.keyboard("{Meta>}o{/Meta}"); // Command + lowercase
    userEvent.keyboard("{Meta>}O{/Meta}"); // Command + uppercase
    expect(screen.getByTestId("open-file-input").click).toHaveBeenCalledTimes(4);
  });

  test("save shortcut: should show save dialog", async () => {
    jest.spyOn(screen.getByTestId("save-file-anchor"), "click");
    userEvent.keyboard("{Control>}s{/Control}"); // Control + lowercase
    userEvent.keyboard("{Control>}S{/Control}"); // Control + uppercase
    userEvent.keyboard("{Meta>}s{/Meta}"); // Command + lowercase
    userEvent.keyboard("{Meta>}S{/Meta}"); // Command + uppercase
    expect(screen.getByTestId("save-file-anchor").click).toHaveBeenCalledTimes(4);
  });

  test("open shortcut: should show open dialog", async () => {
    jest.spyOn(screen.getByTestId("open-file-input"), "click");
    userEvent.keyboard("{Control>}o{/Control}");
    expect(screen.getByTestId("open-file-input").click).toHaveBeenCalled();
  });

  /****************************************************************************
   * Drag-and-drop files
   ****************************************************************************/

  test("drop source file: should load file", async () => {
    // Mock source file
    const fileBuffer = new Uint8Array([65, 66, 67]); // ABC
    File.prototype.arrayBuffer = jest.fn().mockResolvedValueOnce(fileBuffer);
    const file = new File([fileBuffer], "file.ned");

    mockDropEvent(screen.getByTestId("file-drop-target"), file);
    await act(async () => undefined); // Wait for file read

    expect(codeMirrorInstance.getValue()).toBe("ABC");
  });

  test("drop memory file: should load file", async () => {
    // Mock binary file
    const fileBuffer = buildRamsesMemoryFile();
    File.prototype.arrayBuffer = jest.fn().mockResolvedValueOnce(fileBuffer);
    const file = new File([fileBuffer], "file.mem");

    mockDropEvent(screen.getByTestId("file-drop-target"), file);
    await act(async () => undefined); // Wait for file read

    expect(screen.getByText("LDR A 128")).toBeInTheDocument();
  });

});
