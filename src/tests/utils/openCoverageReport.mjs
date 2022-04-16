/* eslint-disable no-undef */

import { resolve } from "path";
import { exec } from "child_process";

const reportPath = resolve("./coverage/lcov-report/index.html");

function openFile(filePath) {
  switch (process.platform) {
    case "darwin": return exec(`open ${filePath}`);
    case "win32": return exec(`start ${filePath}`);
    default: return exec(`xdg-open ${filePath}`);
  }
}

openFile(reportPath);
