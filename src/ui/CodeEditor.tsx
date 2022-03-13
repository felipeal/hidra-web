import React from "react";
import { Machine } from "../core/Machine";
import { UnControlled as CodeMirror } from "react-codemirror2";
import codemirror from "codemirror";

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
  if (stream.eat(/;/)) { // TODO: Handle isInsideString
    stream.skipToEnd();
    return "hidra-comment";
  }

  // If word
  if (stream.eatWhile(/\w/)) {
    if (arrayContains(instructions, stream.current())) {
      return "hidra-instruction";
    } else if (arrayContains(directives, stream.current())) {
      return "hidra-directive";
    } else {
      return;
    }
  }

  stream.next();
}

export default function CodeEditor({ machine }: { machine: Machine }) {
  defineCodeMirrorMode(machine);

  return (
    <CodeMirror options={{ mode: machine.getName(), lineNumbers: true, lineWrapping: true }} editorDidMount={editor => window.codeMirrorInstance = editor} />
  );
}
