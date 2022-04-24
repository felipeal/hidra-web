import React, { LegacyRef } from "react";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import MemoryInstructionsRow from "./MemoryInstructionsRow";
import { TableDimensions, toPx } from "./utils/LayoutUtils";
import { Machine } from "../core/Machine";
import { Assembler } from "../core/Assembler";
import { range } from "../core/utils/FunctionUtils";

export function MemoryInstructions({ instructionsDimensions, firstRowsOnly, machine, assembler, displayHex }: {
  instructionsDimensions: TableDimensions, firstRowsOnly: boolean | undefined,
  machine: Machine, assembler: Assembler, displayHex: boolean
}) {
  return <div className="instructions-table table" data-testid="instructions-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryInstructionsHeader instructionsDimensions={instructionsDimensions} />
          {(firstRowsOnly
            ? range(8).map((address) => (
              <MemoryInstructionsRow key={address} columnWidths={instructionsDimensions.columnWidths} style={{}}
                address={address} machine={machine} assembler={assembler} displayHex={displayHex} />
            ))
            : <FixedSizeList width={instructionsDimensions.rowWidth} height={autoSizerHeight - instructionsDimensions.headerHeight - 2}
              itemCount={machine.getMemorySize()} itemSize={instructionsDimensions.rowHeight} style={{ overflowX: "hidden" }}
            >
              {({ index, style }) => (
                <MemoryInstructionsRow columnWidths={instructionsDimensions.columnWidths} style={style}
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

function MemoryInstructionsHeader({ instructionsDimensions, headerRef }: {
  instructionsDimensions?: TableDimensions,
  headerRef?: LegacyRef<HTMLDivElement>
}) {
  return <div ref={headerRef} className="tr" style={{ display: "flex", height: toPx(instructionsDimensions?.headerHeight) }}>
    <div className="th" style={{ width: toPx(instructionsDimensions?.columnWidths[0]) }}>PC</div>
    <div className="th" style={{ width: toPx(instructionsDimensions?.columnWidths[1]) }}>End.</div>
    <div className="th" style={{ width: toPx(instructionsDimensions?.columnWidths[2]) }}>Valor</div>
    <div className="th" style={{ width: toPx(instructionsDimensions?.columnWidths[3]) }}>Instrução</div>
  </div>;
}
