import { Machine } from "../../core/Machine";
import { Assembler } from "../../core/Assembler";
import CodeMirror from "codemirror";

export function defineCodeMirrorMode(machine: Machine): void {
  CodeMirror.defineMode(machine.getName(), () => {
    return {
      token: makeFunction_processToken(machine)
    };
  });
}

export function makeFunction_processToken(machine: Machine): (stream: CodeMirror.StringStream) => string | null {
  const instructions = machine.getInstructions().map(instruction => instruction.getMnemonic());
  const directives = Assembler.DIRECTIVES;

  return (stream: CodeMirror.StringStream) => {
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
    } else if (stream.eat("'")) { // Unfinished string
      stream.skipToEnd();
      return "hidra-string";
    }

    stream.next();
    return null;
  };

}

function arrayContains(array: string[], needle: string): boolean {
  const lower = needle.toLowerCase();
  return (array.indexOf(lower) > -1);
}
