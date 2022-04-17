import { Machine } from "../../core/Machine";
import { Assembler } from "../../core/Assembler";
import CodeMirror from "codemirror";

export function defineCodeMirrorMode(machine: Machine): void {
  CodeMirror.defineMode(machine.getName(), () => {
    const instructions = machine.getInstructions().map(instruction => instruction.getMnemonic());
    const directives = ["db", "dab", "dw", "daw", "org"]; // TODO: Move directives

    return {
      token: function (stream: CodeMirror.StringStream, _state: unknown): string | null {
        return processToken(stream, instructions, directives);
      }
    };
  });
}

function processToken(stream: CodeMirror.StringStream, instructions: string[], directives: string[]): string | null {
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
      return null;
    }
  }

  const stringMatch = stream.match(Assembler.STRING_PATTERN, false);
  if (stringMatch) {
    stream.match(`'${stringMatch[1]}'`);
    return "hidra-string";
  } else if (stream.eat("'")) { // Unclosed string
    stream.skipToEnd();
    return "hidra-string";
  }

  stream.next();
  return null;
}

function arrayContains(array: string[], needle: string): boolean {
  const lower = needle.toLowerCase();
  return (array.indexOf(lower) > -1);
}
