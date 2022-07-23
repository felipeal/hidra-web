import CodeMirror, { Editor, LineHandle } from "codemirror";
import React, { useEffect, useRef } from "react";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";
import { scrollToPCSourceLine } from "./utils/FocusHandler";
import { defineCodeMirrorMode } from "./utils/SyntaxHighlighter";

// Search / Replace add-on
import "codemirror/addon/search/search";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/dialog/dialog.css";

function makeBreakpointMarker() {
  return Object.assign(document.createElement("div"), { className: "breakpoint-marker", innerHTML: "●" }) as HTMLDivElement;
}

function makePCMarker() {
  return Object.assign(document.createElement("div"), { className: "pc-sp-arrow", innerHTML: "→" }) as HTMLDivElement;
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

export default function CodeEditor({ machine, assembler, displayFollowPC, displayWrap }: {
  machine: Machine, assembler: Assembler, displayFollowPC: boolean, displayWrap: boolean
}) {
  const ref = useRef<HTMLDivElement>(null);

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
    return machine.subscribeToEvent(`REG.${machine.getPCName()}`, (pcAddress) => {
      currentInstructionLineHandle && codeMirrorInstance.removeLineClass(currentInstructionLineHandle, "background", "current-instruction-line");
      currentInstructionLineHandle && codeMirrorInstance.setGutterMarker(currentInstructionLineHandle, "current-instruction-gutter", null);
      currentInstructionLineHandle = codeMirrorInstance.getLineHandle(assembler.getAddressCorrespondingSourceLine(pcAddress as number));
      currentInstructionLineHandle && codeMirrorInstance.addLineClass(currentInstructionLineHandle, "background", "current-instruction-line");
      currentInstructionLineHandle && codeMirrorInstance.setGutterMarker(currentInstructionLineHandle, "current-instruction-gutter", makePCMarker());

      if (displayFollowPC) {
        scrollToPCSourceLine(assembler);
      }
    });
  }, [machine, assembler, displayFollowPC]);

  defineCodeMirrorMode(machine);

  return (
    <div style={{ height: "100%" }} ref={ref} />
  );
}
