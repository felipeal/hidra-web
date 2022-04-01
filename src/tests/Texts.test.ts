import { Texts } from "../core/Texts";
import { buildMachine, getMachineNames } from "../ui/MachineUtils";

describe("Texts", () => {

  test("instructions: should have descriptions for every machine", () => {
    for (const machine of getMachineNames().map(buildMachine)) {
      const instructionFormats = machine.getInstructions().map(i => i.getAssemblyFormat());
      const descriptions = instructionFormats.map(f => Texts.getInstructionDescription(f, machine));

      // Each instruction for a specific machine should have a distinct name/description
      expect(new Set(descriptions.map(d => d[0]).filter(d => d)).size).toEqual(instructionFormats.length);
      expect(new Set(descriptions.map(d => d[1]).filter(d => d)).size).toEqual(instructionFormats.length);
    }
  });

});
