let firstTextExecution = true;

export default () => {
  if (firstTextExecution) {
    firstTextExecution = false;
  } else {
    console.log("\n".repeat(25)); // Whitespace between test executions
  }
};
