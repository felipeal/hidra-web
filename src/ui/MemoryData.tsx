import React, { RefObject, useEffect, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";
import { addressToHex, asciiValueToString, uncheckedByteStringToNumber, unsignedByteToString } from "../core/utils/Conversions";
import { combineUnsubscribeCallbacks } from "../core/utils/EventUtils";
import { calculateScrollOffset, focusMemoryInput, onFocusSelectAll } from "./utils/FocusHandler";
import { TableDimensions, toPx } from "./utils/LayoutUtils";

const CHAR_COLUMN_INDEX = 2;

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

export function MemoryData({ dimensions, scrollbarWidth, machine, assembler, displayHex, displayNegative, displayChars }: {
  dimensions: TableDimensions, scrollbarWidth: number,
  machine: Machine, assembler: Assembler,
  displayHex: boolean, displayNegative: boolean, displayChars: boolean
}) {
  const [table, setTable] = useState<FixedSizeList | null>(null);

  useEffect(() => {
    table?.scrollTo(calculateScrollOffset(machine.getDefaultDataStartingAddress(), dimensions.rowHeight));
  }, [machine, table, dimensions.rowHeight]);

  const hiddenCharColumnWidth = (displayChars ? 0 : dimensions.columnWidths[CHAR_COLUMN_INDEX]);
  return <div className="memory-table" data-testid="data-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryDataHeader dimensions={dimensions} displayChars={displayChars} />
          {(<FixedSizeList width={dimensions.rowWidth + scrollbarWidth - hiddenCharColumnWidth} height={autoSizerHeight - dimensions.headerHeight - 2}
            ref={setTable} itemCount={machine.getMemorySize()} itemSize={dimensions.rowHeight} style={{ overflowX: "hidden" }}
            initialScrollOffset={calculateScrollOffset(machine.getDefaultDataStartingAddress(), dimensions.rowHeight)}
          >
            {({ index, style }) => (
              <MemoryDataRow key={index} columnWidths={dimensions.columnWidths} style={style}
                address={index} machine={machine} assembler={assembler}
                displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars} />
            )}
          </FixedSizeList>)}
        </>
      )}
    </AutoSizer>
  </div>;
}

export function MemoryDataForMeasurements({ headerRef, bodyRef }: {
  headerRef: RefObject<HTMLDivElement>, bodyRef: RefObject<HTMLDivElement>
}) {
  return (<div className="memory-table">
    <MemoryDataHeader headerRef={headerRef} displayChars />
    <div className="memory-body-row" ref={bodyRef}>
      <div className="memory-body-cell">65535</div>
      <div className="memory-body-cell">
        <input className="memory-value" />
      </div>
      <div className="memory-body-cell">W</div>
      <div className="memory-body-cell">ABCDEFABCDEF</div>
    </div>
  </div>);
}

//////////////////////////////////////////////////
// Table header
//////////////////////////////////////////////////

function MemoryDataHeader({ dimensions, headerRef, displayChars }: {
  dimensions?: TableDimensions,
  headerRef?: RefObject<HTMLDivElement>,
  displayChars: boolean
}) {
  const display = dimensions && "flex"; // Once already measured, uses flex to fill with background color
  return <div ref={headerRef} className="memory-header-row" style={{ height: toPx(dimensions?.headerHeight), display }}>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[0]) }}>End.</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[1]) }}>Dado</div>
    {displayChars && <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[2]) }}>Car.</div>}
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[3]) }}>Label</div>
  </div>;
}

//////////////////////////////////////////////////
// Table row
//////////////////////////////////////////////////

export function MemoryDataRow({ columnWidths, style, address, machine, assembler, displayHex, displayNegative, displayChars }: {
  columnWidths: number[], style: React.CSSProperties,
  address: number, machine: Machine, assembler: Assembler,
  displayHex: boolean, displayNegative: boolean, displayChars: boolean
}) {
  const [value, setValue] = useState(unsignedByteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
  const [label, setLabel] = useState(assembler.getAddressCorrespondingLabel(address));

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(machine.getMemoryValue(address), { displayHex, displayNegative }));
    setLabel(assembler.getAddressCorrespondingLabel(address));

    // Event subscriptions
    return combineUnsubscribeCallbacks([
      machine.subscribeToEvent(`MEM.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex, displayNegative }))),
      assembler.subscribeToEvent(`LABEL.${address}`, (newLabel) => setLabel(String(newLabel)))
    ]);
  }, [machine, assembler, displayHex, displayNegative, address]);

  return (
    <div className="memory-body-row" style={{ ...style, display: "flex" }}>
      {/* Address cell */}
      <div className="memory-body-cell memory-address" style={{ width: toPx(columnWidths[0]) }}>
        {displayHex ? addressToHex(address, machine.getMemorySize()) : address}
      </div>

      {/* Data cell */}
      <div className="memory-body-cell" style={{ width: toPx(columnWidths[1]) }}>
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

      {/* Character cell */}
      {displayChars && <div className="memory-body-cell" style={{ width: toPx(columnWidths[2]) }}>
        {asciiValueToString(uncheckedByteStringToNumber(value, { displayHex }))}
      </div>}

      {/* Label cell */}
      <div className="memory-body-cell" style={{ width: toPx(columnWidths[3]), overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
    </div>
  );
}
