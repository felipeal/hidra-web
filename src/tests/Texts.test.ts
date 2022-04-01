import { Assembler } from "../core/Assembler";
import { Texts } from "../core/Texts";
import { buildMachine, getMachineNames } from "../ui/MachineUtils";

describe("Texts", () => {

  test("instructions: should have descriptions for every machine", () => {
    for (const machine of getMachineNames().map(buildMachine)) {
      const instructionFormats = machine.getInstructions().map(i => i.getAssemblyFormat());
      const descriptions = instructionFormats.map(f => Texts.getInstructionDescription(f, machine));

      // No description should be empty
      for (const [name, description] of descriptions) {
        expect(name).not.toBeFalsy();
        expect(description).not.toBeFalsy();
      }

      // Each instruction for a specific machine should have a distinct name/description
      expect(new Set(descriptions.map(d => d[0])).size).toEqual(instructionFormats.length);
      expect(new Set(descriptions.map(d => d[1])).size).toEqual(instructionFormats.length);
    }
  });

  test("directives: should have descriptions for every directive", () => {
    for (const directive of [...Assembler.DIRECTIVES, "dab/daw"]) {
      const description = Texts.getDirectiveDescription(directive);
      expect(description.name).not.toBeFalsy();
      expect(description.description).not.toBeFalsy();
      expect(description.examples).not.toBeFalsy();
    }
  });

});
