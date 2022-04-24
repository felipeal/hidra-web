import React, { LegacyRef } from "react";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import MemoryInstructionsRow from "./MemoryInstructionsRow";
import { TableDimensions, toPx } from "./utils/LayoutUtils";
import { Machine } from "../core/Machine";
import { Assembler } from "../core/Assembler";

export function MemoryInstructions({ dimensions, machine, assembler, displayHex }: {
  dimensions: TableDimensions, machine: Machine, assembler: Assembler, displayHex: boolean
}) {
  return <div className="instructions-table table" data-testid="instructions-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryInstructionsHeader dimensions={dimensions} />
          {(<FixedSizeList width={dimensions.rowWidth} height={autoSizerHeight - dimensions.headerHeight - 2}
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
  headerRef: LegacyRef<HTMLDivElement>, bodyRef: LegacyRef<HTMLDivElement>,
}) {
  return (<div className="table" style={{ display: "table" }}>
    <MemoryInstructionsHeader headerRef={headerRef}/>
    <div className="tr" ref={bodyRef} style={{ overflowY: "scroll" }}>
      <div className="td">→</div>
      <div className="td">4096</div>
      <div className="td">
        <input className="table-value"/>
      </div>
      <div className="td">IF R63 255 255</div>
    </div>
  </div>);
}

function MemoryInstructionsHeader({ dimensions, headerRef }: {
  dimensions?: TableDimensions,
  headerRef?: LegacyRef<HTMLDivElement>
}) {
  return <div ref={headerRef} className="tr" style={{ display: "flex", height: toPx(dimensions?.headerHeight) }}>
    <div className="th" style={{ width: toPx(dimensions?.columnWidths[0]) }}>PC</div>
    <div className="th" style={{ width: toPx(dimensions?.columnWidths[1]) }}>End.</div>
    <div className="th" style={{ width: toPx(dimensions?.columnWidths[2]) }}>Valor</div>
    <div className="th" style={{ width: toPx(dimensions?.columnWidths[3]) }}>Instrução</div>
  </div>;
}
