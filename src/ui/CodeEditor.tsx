import React, { useEffect } from "react";
import { Machine } from "../core/Machine";
import { Assembler } from "../core/Assembler";
import { UnControlled as CodeMirror } from "react-codemirror2";
import codemirror, { Editor, LineHandle } from "codemirror";

function arrayContains(array: string[], needle: string): boolean {
  const lower = needle.toLowerCase();
  return (array.indexOf(lower) > -1);
}

function defineCodeMirrorMode(machine: Machine) {
  // @ts-ignore
  codemirror.defineMode(machine.getName(), () => {
    const instructions = machine.getInstructions().map(instruction => instruction.getMnemonic());
    const directives = ["db", "dab", "dw", "daw", "org"]; // TODO: Move directives

    return {
      token: function (stream: CodeMirror.StringStream, _state: unknown) {
        return processToken(stream, instructions, directives);
      }
    };
  });
}

function processToken(stream: CodeMirror.StringStream, instructions: string[], directives: string[]) {
  // If semicolon
  if (stream.eat(";")) {
    stream.skipToEnd();
    return "hidra-comment";
  }

  // If word
  if (stream.match(/\w+/)) {
    if (arrayContains(instructions, stream.current())) {
      return "hidra-instruction";
    } else if (arrayContains(directives, stream.current())) {
      return "hidra-directive";
    } else {
      return;
    }
  }

  // If string
  if (stream.match(/'''([^']|$)/, false)) { // Literal single quote (''')
    stream.match(/'''/);
    return "hidra-string";
  } else if (stream.eat("'")) {
    stream.match(/('''|[^'])+/);
    stream.eat("'");
    return "hidra-string";
  }

  stream.next();
}

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

let currentPCLineHandle: LineHandle | null = null;

export default function CodeEditor({ machine, assembler }: { machine: Machine, assembler: Assembler }) {
  useEffect(() => {
    window.codeMirrorInstance?.on("gutterClick", toggleBreakpoint);
  }, []);

  useEffect(() => {
    machine.subscribeToEvent("REG.PC", (value) => {
      currentPCLineHandle && codeMirrorInstance.removeLineClass(currentPCLineHandle, "background", "current-pc-line");
      currentPCLineHandle && codeMirrorInstance.setGutterMarker(currentPCLineHandle, "current-pc-gutter", null);
      currentPCLineHandle = codeMirrorInstance.getLineHandle(assembler.getAddressCorrespondingSourceLine(Number(value)));
      currentPCLineHandle && codeMirrorInstance.addLineClass(currentPCLineHandle, "background", "current-pc-line");
      currentPCLineHandle && codeMirrorInstance.setGutterMarker(currentPCLineHandle, "current-pc-gutter", makePCMarker());
    });
  }, [machine]);

  defineCodeMirrorMode(machine);

  return (
    <CodeMirror options={{ mode: machine.getName(), lineNumbers: true, lineWrapping: true, gutters: ["current-pc-gutter", "breakpoints-gutter", "CodeMirror-linenumbers"] }} editorDidMount={editor => window.codeMirrorInstance = editor} />
  );
}
