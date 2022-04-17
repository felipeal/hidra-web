import React, { LegacyRef, useEffect, useRef } from "react";
import { Machine } from "../core/Machine";
import { Assembler } from "../core/Assembler";
import CodeMirror, { Editor, LineHandle } from "codemirror";
import { defineCodeMirrorMode } from "./utils/SyntaxHighlighter";

function makeBreakpointMarker() {
  const marker = document.createElement("div");
  marker.className = "breakpoint-marker";
  marker.innerHTML = "●";
  return marker;
}

function makePCMarker() {
  const marker = document.createElement("div");
  marker.className = "pc-sp-arrow";
  marker.innerHTML = "→";
  return marker;
}

function toggleBreakpoint(codeMirror: Editor, lineNumber: number) {
  const info = codeMirror.lineInfo(lineNumber);
  codeMirror.setGutterMarker(lineNumber, "breakpoints-gutter", info.gutterMarkers?.["breakpoints-gutter"] ? null : makeBreakpointMarker());
}

export function hasBreakpointAtLine(lineNumber: number): boolean {
  const info = codeMirrorInstance.lineInfo(lineNumber);
  return Boolean(info?.gutterMarkers?.["breakpoints-gutter"]);
}

let currentInstructionLineHandle: LineHandle | null = null;

export default function CodeEditor({ machine, assembler, displayWrap }: { machine: Machine, assembler: Assembler, displayWrap: boolean }) {
  const ref = useRef<HTMLDivElement>();

  // CodeMirror initialization
  useEffect(() => {
    window.codeMirrorInstance = window.codeMirrorInstance || CodeMirror(ref.current!, {
      lineNumbers: true,
      gutters: ["current-instruction-gutter", "breakpoints-gutter", "CodeMirror-linenumbers"]
    });
    window.codeMirrorInstance.setSize("100%", "100%");
    window.codeMirrorInstance.on("gutterClick", toggleBreakpoint);
  }, []);

  useEffect(() => {
    window.codeMirrorInstance.setOption("lineWrapping", displayWrap);
  }, [displayWrap]);

  useEffect(() => {
    window.codeMirrorInstance.setOption("mode", machine.getName());
    return machine.subscribeToEvent("REG.PC", (value) => {
      currentInstructionLineHandle && codeMirrorInstance.removeLineClass(currentInstructionLineHandle, "background", "current-instruction-line");
      currentInstructionLineHandle && codeMirrorInstance.setGutterMarker(currentInstructionLineHandle, "current-instruction-gutter", null);
      currentInstructionLineHandle = codeMirrorInstance.getLineHandle(assembler.getAddressCorrespondingSourceLine(value as number));
      currentInstructionLineHandle && codeMirrorInstance.addLineClass(currentInstructionLineHandle, "background", "current-instruction-line");
      currentInstructionLineHandle && codeMirrorInstance.setGutterMarker(currentInstructionLineHandle, "current-instruction-gutter", makePCMarker());
    });
  }, [machine, assembler]);

  defineCodeMirrorMode(machine);

  return (
    <div style={{ height: "100%" }} ref={ref as LegacyRef<HTMLDivElement>} />
  );
}
