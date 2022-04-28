import { } from "./utils/jsdomSetup";

import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../ui/App";
import { getSelectedMachine, runPendingTimers, setSourceCode } from "./utils/AppTestFunctions";

async function openFile(fileName: string, arrayBuffer: Uint8Array, inputTestId = "open-file-input") {
  File.prototype.arrayBuffer = jest.fn().mockResolvedValueOnce(arrayBuffer);

  await act(async () => {
    userEvent.upload(screen.getByTestId(inputTestId), new File([arrayBuffer], fileName));
  });
}

async function importMemory(fileName: string, arrayBuffer: Uint8Array) {
  return openFile(fileName, arrayBuffer, "import-memory-input");
}

function buildRamsesMemoryFile(): Uint8Array {
  const ramsesIdentifier = [0x03, 0x52, 0x4D, 0x53]; // 3RMS
  const instructions = [0x20, 0, 0x80, 0]; // LDR A 128
  const padding = new Array(512 - 4).fill(0);
  return new Uint8Array([...ramsesIdentifier, ...instructions, ...padding]);
}

describe("File Actions", () => {

  beforeEach(async () => {
    render(<App/>);
    setSourceCode("");
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
    const utf8EncodedSource = new TextEncoder().encode(expectedSource);

    await openFile("file.rad", utf8EncodedSource);

    expect(getSelectedMachine()).toBe("Ramses");
    expect(codeMirrorInstance.getValue()).toBe(expectedSource);
  });

  test("open: should auto-convert windows-1252 files", async () => {
    const expectedSource = "áéíóú";
    const windows1252EncodedSource = new Uint8Array([0xE1, 0xE9, 0xED, 0xF3, 0xFA]);

    await openFile("file.ahd", windows1252EncodedSource);

    expect(codeMirrorInstance.getValue()).toBe(expectedSource);
  });

  test("open: should warn in case there are unsaved changes", async () => {
    codeMirrorInstance.setValue("unsaved source code");

    // User cancels
    jest.spyOn(global, "confirm").mockReturnValueOnce(false);
    await openFile("file.rad", new Uint8Array([]));
    expect(global.confirm).toHaveBeenCalled();
    expect(codeMirrorInstance.getValue()).toBe("unsaved source code");

    // User confirms
    jest.spyOn(global, "confirm").mockReturnValueOnce(true);
    await openFile("file.rad", new Uint8Array([]));
    expect(global.confirm).toHaveBeenCalled();
    expect(codeMirrorInstance.getValue()).toBe("");
  });

  test("open: should accept memory files", async () => {
    await openFile("file.mem", buildRamsesMemoryFile());

    expect(getSelectedMachine()).toBe("Ramses");
    expect(screen.getByText("LDR A 128")).toBeInTheDocument();
  });

  /****************************************************************************
   * File -> Save
   ****************************************************************************/

  test("save: should download file", () => {
    global.URL.createObjectURL = jest.fn();
    jest.spyOn(URL, "createObjectURL").mockReturnValueOnce("generated-url");
    jest.spyOn(screen.getByTestId("save-file-anchor"), "click").mockImplementationOnce(jest.fn());

    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Salvar"));

    const extensionRegEx = /\.ned$/;
    expect(screen.getByTestId<HTMLAnchorElement>("save-file-anchor").download).toMatch(extensionRegEx);
    expect(screen.getByTestId<HTMLAnchorElement>("save-file-anchor").href).toMatch(/generated-url/);
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
    global.URL.createObjectURL = jest.fn();
    jest.spyOn(URL, "createObjectURL").mockReturnValueOnce("generated-url");
    jest.spyOn(screen.getByTestId("export-memory-anchor"), "click").mockImplementationOnce(jest.fn());

    userEvent.click(screen.getByText(/Arquivo/));
    userEvent.click(screen.getByText("Exportar memória"));

    const extensionRegEx = /\.mem$/;
    expect(screen.getByTestId<HTMLAnchorElement>("export-memory-anchor").download).toMatch(extensionRegEx);
    expect(screen.getByTestId<HTMLAnchorElement>("export-memory-anchor").href).toMatch(/generated-url/);
  });

  /****************************************************************************
   * Drag-and-drop files
   ****************************************************************************/

  test.skip("drop source file: should load file", () => {
    // TODO
  });

  test.skip("drop memory file: should load file", () => {
    // TODO
  });

});