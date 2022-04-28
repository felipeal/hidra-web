import React, { RefObject, useEffect, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";
import { addressToHex, instructionStringToHex, uncheckedByteStringToNumber, unsignedByteToString } from "../core/utils/Conversions";
import { buildUnsubscribeCallback } from "../core/utils/EventUtils";
import { classes, TableDimensions, toPx } from "./utils/LayoutUtils";

function computeIsCurrentInstruction(address: number, assembler: Assembler): boolean {
  const addressSourceLine = assembler.getAddressCorrespondingSourceLine(address);
  const currentSourceLine = (addressSourceLine >= 0) && assembler.getPCCorrespondingSourceLine();
  return addressSourceLine === currentSourceLine;
}

function focusInput(row: number) {
  const tableInputs = document.querySelectorAll(".instructions-table .memory-value");
  (tableInputs[row] as HTMLInputElement)?.focus();
}

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

export function MemoryInstructions({ dimensions, scrollbarWidth, machine, assembler, displayHex }: {
  dimensions: TableDimensions, scrollbarWidth: number, machine: Machine, assembler: Assembler, displayHex: boolean
}) {
  return <div className="memory-table instructions-table" data-testid="instructions-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryInstructionsHeader dimensions={dimensions} />
          {(<FixedSizeList width={dimensions.rowWidth + scrollbarWidth} height={autoSizerHeight - dimensions.headerHeight - 2}
            itemCount={machine.getMemorySize()} itemSize={dimensions.rowHeight} style={{ overflowX: "hidden" }}
          >
            {({ index, style }) => (
              <MemoryInstructionsRow key={index} columnWidths={dimensions.columnWidths} style={style}
                address={index} machine={machine} assembler={assembler} displayHex={displayHex} />
            )}
          </FixedSizeList>)}
        </>
      )}
    </AutoSizer>
  </div>;
}

export function MemoryInstructionsForMeasurements({ headerRef, bodyRef }: {
  headerRef: RefObject<HTMLDivElement>, bodyRef: RefObject<HTMLDivElement>,
}) {
  return (<div className="memory-table">
    <MemoryInstructionsHeader headerRef={headerRef}/>
    <div className="memory-body-row" ref={bodyRef}>
      <div className="memory-body-cell">→</div>
      <div className="memory-body-cell">4096</div>
      <div className="memory-body-cell">
        <input className="memory-value"/>
      </div>
      <div className="memory-body-cell">IF R63 255 255</div>
    </div>
  </div>);
}

//////////////////////////////////////////////////
// Table header
//////////////////////////////////////////////////

function MemoryInstructionsHeader({ dimensions, headerRef }: {
  dimensions?: TableDimensions,
  headerRef?: RefObject<HTMLDivElement>
}) {
  const display = dimensions && "flex"; // Once already measured, uses flex to fill with background color
  return <div ref={headerRef} className="memory-header-row" style={{ height: toPx(dimensions?.headerHeight), display }}>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[0]) }}>PC</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[1]) }}>End.</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[2]) }}>Valor</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[3]) }}>Instrução</div>
  </div>;
}

//////////////////////////////////////////////////
// Table row
//////////////////////////////////////////////////

function MemoryInstructionsRow({ columnWidths, style, address, machine, assembler, displayHex }:
  { columnWidths: number[], style: React.CSSProperties, address: number, machine: Machine, assembler: Assembler, displayHex: boolean}
) {
  const [value, setValue] = useState(unsignedByteToString(machine.getMemoryValue(address), { displayHex }));
  const [instructionString, setInstructionString] = useState(String(machine.getInstructionString(address)));
  const [isCurrentPos, setIsCurrentPos] = useState(machine.getPCValue() === address);
  const [isCurrentInstruction, setIsCurrentInstruction] = useState(computeIsCurrentInstruction(address, assembler));

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(machine.getMemoryValue(address), { displayHex }));
    setInstructionString(machine.getInstructionString(address));
    setIsCurrentPos(machine.getPCValue() === address);
    setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));

    // Event subscriptions
    return buildUnsubscribeCallback([
      machine.subscribeToEvent(`REG.${machine.getPCName()}`, (newValue) => {
        setIsCurrentPos(newValue === address);
        setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));
      }),
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex }))),
      machine.subscribeToEvent(`INS.STR.${address}`, (newValue) => setInstructionString(newValue as string))
    ]);
  }, [machine, assembler, displayHex, address]);

  return (
    <div style={{ ...style, display: "flex" }}
      className={classes("memory-body-row", "instruction-row", (isCurrentInstruction ? "current-instruction-line" : ""))}
    >
      <div style={{ width: toPx(columnWidths[0]) }}
        className="memory-body-cell monospace-font pc-sp-arrow memory-pc-sp-cell" onClick={() => machine.setPCValue(address)}>
        {isCurrentPos ? "→" : ""}
      </div>

      <div style={{ width: toPx(columnWidths[1]) }}
        className="memory-body-cell memory-address td">{displayHex ? addressToHex(address, machine.getMemorySize()) : address}</div>

      <div className="memory-body-cell" style={{ width: toPx(columnWidths[2]) }}>
        <input className="memory-value" inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          machine.setMemoryValue(address, uncheckedByteStringToNumber(event.target.value, { displayHex }));
          machine.updateInstructionStrings();
        }} onKeyDown={(event) => {
          if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
            focusInput(address - 1);
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            focusInput(address + 1);
          }
        }} onFocus={(event) => {
          setTimeout(() => (event.target as HTMLInputElement).select(), 0);
        }} />
      </div>

      <div className="memory-body-cell" style={{ width: toPx(columnWidths[3]) }}>
        {displayHex ? instructionStringToHex(instructionString) : instructionString}
      </div>
    </div>
  );
}
