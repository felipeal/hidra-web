import Tippy from "@tippyjs/react";
import React from "react";
import { hideAll as tippyHideAll } from "tippy.js";
import { hideOnPopperBlur } from "./extensions/hideOnPopperBlur";

export function Menu({ title, children }: { title: string, children: React.ReactNode[] }) {
  return <div>
    <Tippy trigger="click" interactive appendTo="parent" arrow={false} theme="light-border" placement="bottom-start"
      content={<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {children}
      </div>}
      plugins={[hideOnPopperBlur]}
    >
      <button className="navbar-item">{title} ▾</button>
    </Tippy>
  </div>;
}

export function SubMenuItem({ title, callback }: { title: string, callback: () => void }) {
  return <button className="navbar-submenu-item" onClick={() => {
    callback();
    tippyHideAll();
  }}>{title}</button>;
}

export function SubMenuCheckBox({ title, checked, setChecked }: { title: string, checked: boolean, setChecked: (checked: boolean) => void }) {
  return <div className="navbar-submenu-checkbox" style={{ display: "flex", flexDirection: "row", gap: "4px", alignItems: "center" }}
    onMouseDown={() => setChecked(!checked)}
  >
    <input id={`drop-down-item-${title}-input`} type="checkbox" checked={checked} onKeyDown={(event) => {
      if (event.key === " ") {
        setChecked(!checked);
      }
    }} onChange={() => {/* Comment to suppress warning: value is changed by parent element. */}} />
    <label htmlFor={`drop-down-item-${title}-input`}>{title}</label>
  </div>;
}

export function SubMenuSeparator() {
  return <div className="navbar-submenu-separator" />;
}
