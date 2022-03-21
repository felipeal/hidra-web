import React, { useEffect } from "react";
import { Machine } from "../core/Machine";
import { UnControlled as CodeMirror } from "react-codemirror2";
import codemirror, { Editor } from "codemirror";

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

function makeMarker() {
  const marker = document.createElement("div");
  marker.className = "breakpoint";
  marker.innerHTML = "●";
  return marker;
}

function toggleBreakpoint(codeMirror: Editor, lineNumber: number): void {
  const info = codeMirror.lineInfo(lineNumber);
  codeMirror.setGutterMarker(lineNumber, "breakpoints-gutter", info.gutterMarkers ? null : makeMarker());
}

export function hasBreakpointAtLine(lineNumber: number) {
  const info = codeMirrorInstance.lineInfo(lineNumber);
  return Boolean(info?.gutterMarkers?.["breakpoints-gutter"]);
}

export default function CodeEditor({ machine }: { machine: Machine }) {
  defineCodeMirrorMode(machine);
  useEffect(() => {
    window.codeMirrorInstance?.on("gutterClick", toggleBreakpoint);
  }, []);

  return (
    <CodeMirror options={{ mode: machine.getName(), lineNumbers: true, lineWrapping: true, gutters: ["breakpoints-gutter", "CodeMirror-linenumbers"] }} editorDidMount={editor => window.codeMirrorInstance = editor} />
  );
}
