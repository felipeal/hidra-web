import React, { RefObject, useEffect, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { Volta } from "../core/machines/Volta";
import { addressToHex, charCodeToString, uncheckedByteStringToNumber, unsignedByteToString } from "../core/utils/Conversions";
import { combineUnsubscribeCallbacks } from "../core/utils/EventUtils";
import { calculateScrollOffset, focusMemoryInput, onFocusSelectAll, scrollToRow } from "./utils/FocusHandler";
import { TableDimensions, toPx } from "./utils/LayoutUtils";

const CHAR_COLUMN_INDEX = 3;

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

export function MemoryStack({ dimensions, scrollbarWidth, machine, displayHex, displayNegative, displayChars, displayFollowPC }: {
  dimensions: TableDimensions, scrollbarWidth: number, machine: Volta,
  displayHex: boolean, displayNegative: boolean, displayChars: boolean, displayFollowPC: boolean
}) {
  const [table, setTable] = useState<FixedSizeList | null>(null);

  useEffect(() => {
    table?.scrollToItem(machine.getStackSize() - 1, "end");
  }, [machine, table, dimensions.rowHeight]);

  useEffect(() => {
    if (displayFollowPC && table) {
      return machine.subscribeToEvent("REG.SP", (spAddress) => {
        const rowIndex = machine.getStackSize() - 1 - (spAddress as number);
        scrollToRow(rowIndex, table, dimensions.rowHeight);
      });
    }
  }, [displayFollowPC, machine, table, dimensions.rowHeight]);

  const hiddenCharColumnWidth = (displayChars ? 0 : dimensions.columnWidths[CHAR_COLUMN_INDEX]);
  return <div className="memory-table" data-testid="stack-table" style={{ height: "100%", display: "block" }}>
    <AutoSizer disableWidth>
      {({ height: autoSizerHeight }) => (
        <>
          <MemoryStackHeader dimensions={dimensions} displayChars={displayChars} />
          {(<FixedSizeList width={dimensions.rowWidth + scrollbarWidth - hiddenCharColumnWidth} height={autoSizerHeight - dimensions.headerHeight - 2}
            ref={setTable} itemCount={machine.getStackSize()} itemSize={dimensions.rowHeight} style={{ overflowX: "hidden" }}
            initialScrollOffset={calculateScrollOffset(machine.getStackSize(), dimensions.rowHeight) - autoSizerHeight}
          >
            {({ index, style }) => (
              <MemoryStackRow key={index} columnWidths={dimensions.columnWidths} style={style}
                address={machine.getStackSize() - 1 - index} machine={machine}
                displayHex={displayHex} displayNegative={displayNegative} displayChars={displayChars} />
            )}
          </FixedSizeList>)}
        </>
      )}
    </AutoSizer>
  </div>;
}

export function MemoryStackForMeasurements({ headerRef, bodyRef }: {
  headerRef: RefObject<HTMLDivElement>, bodyRef: RefObject<HTMLDivElement>,
}) {
  return (<div className="memory-table">
    <MemoryStackHeader headerRef={headerRef} displayChars />
    <div className="memory-body-row" ref={bodyRef}>
      <div className="memory-body-cell">→</div>
      <div className="memory-body-cell">63</div>
      <div className="memory-body-cell">
        <input className="memory-value"/>
      </div>
      <div className="memory-body-cell">W</div>
    </div>
  </div>);
}

//////////////////////////////////////////////////
// Table header
//////////////////////////////////////////////////

function MemoryStackHeader({ dimensions, headerRef, displayChars }: {
  dimensions?: TableDimensions,
  headerRef?: RefObject<HTMLDivElement>,
  displayChars: boolean
}) {
  const display = dimensions && "flex"; // Once already measured, uses flex to fill with background color
  return <div ref={headerRef} className="memory-header-row" style={{ height: toPx(dimensions?.headerHeight), display }}>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[0]) }}>SP</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[1]) }}>End.</div>
    <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[2]) }}>Dado</div>
    {displayChars && <div className="memory-header-cell" style={{ width: toPx(dimensions?.columnWidths[3]) }}>Car.</div>}
  </div>;
}

//////////////////////////////////////////////////
// Table row
//////////////////////////////////////////////////

export function MemoryStackRow({ columnWidths, style, address, machine, displayHex, displayNegative, displayChars }: {
  columnWidths: number[], style: React.CSSProperties,
  address: number, machine: Volta,
  displayHex: boolean, displayNegative: boolean, displayChars: boolean
}) {
  const [value, setValue] = useState(unsignedByteToString(machine.getStackValue(address), { displayHex, displayNegative }));
  const [isCurrentStackPos, setIsCurrentStackPos] = useState(machine.getSPValue() === address);

  useEffect(() => {
    // Restore values on external change
    setValue(unsignedByteToString(machine.getStackValue(address), { displayHex, displayNegative }));
    setIsCurrentStackPos(machine.getSPValue() === address);

    // Event subscriptions
    return combineUnsubscribeCallbacks([
      machine.subscribeToEvent("REG.SP", (spAddress) => setIsCurrentStackPos((spAddress as number) === address)),
      machine.subscribeToEvent(`STACK.${address}`, (newValue) => setValue(unsignedByteToString(newValue as number, { displayHex, displayNegative })))
    ]);
  }, [machine, displayHex, displayNegative, address]);

  return (
    <div className="memory-body-row" style={{ ...style, display: "flex" }}>
      {/* SP cell */}
      <div className="memory-body-cell monospace-font pc-sp-arrow memory-pc-sp-cell" style={{ width: toPx(columnWidths[0]) }}
        onClick={() => machine.setSPValue(address)}
      >
        {isCurrentStackPos ? "→" : ""}
      </div>

      {/* Address cell */}
      <div className="memory-body-cell memory-address" style={{ width: toPx(columnWidths[1]) }}>
        {displayHex ? addressToHex(address, machine.getStackSize()) : address}
      </div>

      {/* Data cell */}
      <div className="memory-body-cell" style={{ width: toPx(columnWidths[2]) }}>
        <input className="memory-value" inputMode="numeric" value={value} onChange={(event) => {
          setValue(event.target.value);
        }} onBlur={(event) => {
          // Write value to memory on focus out
          machine.setStackValue(address, uncheckedByteStringToNumber(event.target.value, { displayHex }));
        }} onKeyDown={(event) => {
          if (event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)) {
            focusMemoryInput(event.target as HTMLInputElement, "PREVIOUS");
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            focusMemoryInput(event.target as HTMLInputElement, "NEXT");
          }
        }} onFocus={onFocusSelectAll} />
      </div>

      {/* Character cell */}
      {displayChars && <div className="memory-body-cell" style={{ width: toPx(columnWidths[3]) }}>
        {charCodeToString(uncheckedByteStringToNumber(value, { displayHex }))}
      </div>}
    </div>
  );
}
