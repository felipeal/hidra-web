import React, { RefObject, useEffect, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";
import { addressToHex, immediateValuesToNegative, numbersToHex, uncheckedByteStringToNumber, unsignedByteToString } from "../core/utils/Conversions";
import { combineUnsubscribeCallbacks } from "../core/utils/EventUtils";
import { focusMemoryInput, onFocusSelectAll, scrollToRow } from "./utils/FocusHandler";
import { classes, TableDimensions, toPx } from "./utils/LayoutUtils";

function computeIsCurrentInstruction(address: number, assembler: Assembler): boolean {
  const addressSourceLine = assembler.getAddressCorrespondingSourceLine(address);
  const currentSourceLine = (addressSourceLine >= 0) && assembler.getPCCorrespondingSourceLine();
  return addressSourceLine === currentSourceLine;
}

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

export function MemoryInstructions({ dimensions, scrollbarWidth, machine, assembler, displayHex, displayNegative, displayFollowPC }: {
  dimensions: TableDimensions, scrollbarWidth: number,
  machine: Machine, assembler: Assembler,
  displayHex: boolean, displayNegative: boolean, displayFollowPC: boolean
}) {
  const [table, setTable] = useState<FixedSizeList | null>(null);

  useEffect(() => {
    table?.scrollTo(0);
  }, [machine, table, dimensions.rowHeight]);

  useEffect(() => {
    if (displayFollowPC && table) {
      return machine.subscribeToEvent(`REG.${machine.getPCName()}`, (pcAddress) => {
        scrollToRow(pcAddress as number, table, dimensions.rowHeight);
      });
    }
  }, [displayFollowPC, machine, table, dimensions.rowHeight]);

  return <div className="memory-table" data-testid="instructions-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryInstructionsHeader dimensions={dimensions} />
          {(<FixedSizeList width={dimensions.rowWidth + scrollbarWidth} height={autoSizerHeight - dimensions.headerHeight - 2}
            ref={setTable} itemCount={machine.getMemorySize()} itemSize={dimensions.rowHeight} style={{ overflowX: "hidden" }}
            initialScrollOffset={0}
          >
            {({ index, style }) => (
              <MemoryInstructionsRow key={index} columnWidths={dimensions.columnWidths} style={style}
                address={index} machine={machine} assembler={assembler}
                displayHex={displayHex} displayNegative={displayNegative} />
            )}
          </FixedSizeList>)}
        </>
      )}
    </AutoSizer>
  </div>;
}

export function MemoryInstructionsForMeasurements({ headerRef, bodyRef }: {
  headerRef: RefObject<HTMLDivElement>, bodyRef: RefObject<HTMLDivElement>
}) {
  return (<div className="memory-table">
    <MemoryInstructionsHeader headerRef={headerRef}/>
    <div className="memory-body-row" ref={bodyRef}>
      <div className="memory-body-cell">→</div>
      <div className="memory-body-cell">65535</div>
      <div className="memory-body-cell">
        <input className="memory-value"/>
      </div>
      <div className="memory-body-cell">IF R63 255 255</div>
    </div>
  </div>);
  // TODO: Use Cesar's maximum length? "ADD (-32768(R7)) (-32768(R7))""
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

function MemoryInstructionsRow({ columnWidths, style, address, machine, assembler, displayHex, displayNegative }: {
  columnWidths: number[], style: React.CSSProperties,
  address: number, machine: Machine, assembler: Assembler, displayHex: boolean, displayNegative: boolean
}) {
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
    return combineUnsubscribeCallbacks([
      machine.subscribeToEvent(`REG.${machine.getPCName()}`, (pcAddress) => {
        setIsCurrentPos(pcAddress === address);
        setIsCurrentInstruction(computeIsCurrentInstruction(address, assembler));
      }),
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex }))),
      machine.subscribeToEvent(`INS.STR.${address}`, (newValue) => setInstructionString(newValue as string))
    ]);
  }, [machine, assembler, displayHex, address]);

  return (
    <div className={classes("memory-body-row", (isCurrentInstruction ? "current-instruction-line" : ""))} style={{ ...style, display: "flex" }}>
      {/* PC arrow cell */}
      <div className="memory-body-cell monospace-font pc-sp-arrow memory-pc-sp-cell" style={{ width: toPx(columnWidths[0]) }}
        onClick={() => machine.setPCValue(address)}
      >
        {isCurrentPos ? "→" : ""}
      </div>

      {/* Address cell */}
      <div className="memory-body-cell memory-address" style={{ width: toPx(columnWidths[1]) }}>
        {displayHex ? addressToHex(address, machine.getMemorySize()) : address}
      </div>

      {/* Value cell */}
      <div className="memory-body-cell" style={{ width: toPx(columnWidths[2]) }}>
        <input className="memory-value" inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          machine.setMemoryValue(address, uncheckedByteStringToNumber(event.target.value, { displayHex }));
          machine.updateInstructionStrings();
        }} onKeyDown={(event) => {
          if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
            focusMemoryInput(event.target as HTMLInputElement, "PREVIOUS");
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            focusMemoryInput(event.target as HTMLInputElement, "NEXT");
          }
        }} onFocus={onFocusSelectAll} />
      </div>

      {/* Instruction string cell */}
      <div className="memory-body-cell" style={{ width: toPx(columnWidths[3]) }}>
        {displayHex ? numbersToHex(instructionString) : (displayNegative ? immediateValuesToNegative(instructionString) : instructionString)}
      </div>
    </div>
  );
}
