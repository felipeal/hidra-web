import React, { RefObject } from "react";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import MemoryInstructionsRow from "./MemoryInstructionsRow";
import { TableDimensions, toPx } from "./utils/LayoutUtils";
import { Machine } from "../core/Machine";
import { Assembler } from "../core/Assembler";

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
