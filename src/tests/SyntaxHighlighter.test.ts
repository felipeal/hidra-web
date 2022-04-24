import { } from "./utils/jsdomSetup";

import { makeFunction_processToken } from "../ui/utils/SyntaxHighlighter";
import { Neander } from "../core/machines/Neander";
import CodeMirror from "codemirror";

let processToken: (stream: CodeMirror.StringStream) => string | null;

type TokenStyle = {token: string, style: string | null};

function computeTokenStyles(line: string): TokenStyle[] {
  const tokenStyles: TokenStyle[] = [];
  const stream = new CodeMirror.StringStream(line);

  while (stream.pos < line.length) {
    const style = processToken(stream);
    tokenStyles.push({ token: stream.current(), style });
    stream.start = stream.pos;
  }

  return tokenStyles;
}

function revealStyles(code: string) {
  let result = "";
  for (const tokenStyle of computeTokenStyles(code)) {
    result += tokenStyleToString(tokenStyle);
  }
  return result;
}

function tokenStyleToString({ token, style }: TokenStyle) {
  switch (style) {
    case "hidra-instruction": return `<i>${token}</i>`;
    case "hidra-directive": return `<d>${token}</d>`;
    case "hidra-string": return `<s>${token}</s>`;
    case "hidra-comment": return `<c>${token}</c>`;
    default: return token;
  }
}

describe("Syntax Highlighter", () => {

  beforeAll(() => {
    processToken = makeFunction_processToken(new Neander());
  });

  test("instructions: should highlight when valid", () => {
    expect(revealStyles("lda 0")).toBe("<i>lda</i> 0");
    expect(revealStyles("LdA 0")).toBe("<i>LdA</i> 0"); // Case-insensitive
    expect(revealStyles("POP 0")).toBe("POP 0"); // Different machine's instruction
    expect(revealStyles("NOPX 0")).toBe("NOPX 0"); // Non-existent instruction
    expect(revealStyles("Label: LDA 0")).toBe("Label: <i>LDA</i> 0"); // After label
    expect(revealStyles("LDA 'LDA'")).toBe("<i>LDA</i> <s>'LDA'</s>"); // With string containing instruction
  });

  test("directives: should highlight when valid", () => {
    expect(revealStyles("org 0")).toBe("<d>org</d> 0");
    expect(revealStyles("dB")).toBe("<d>dB</d>"); // Case-insensitive
    expect(revealStyles("dw;")).toBe("<d>dw</d><c>;</c>"); // With comment
    expect(revealStyles("Label: dab 0")).toBe("Label: <d>dab</d> 0"); // With label
    expect(revealStyles("daw 'daw'")).toBe("<d>daw</d> <s>'daw'</s>"); // With string containing directive
  });

  test("strings: should highlight finished and unfinished strings", () => {
    expect(revealStyles(" 'a' ")).toBe(" <s>'a'</s> "); // Finished string
    expect(revealStyles(" 'a ")).toBe(" <s>'a </s>"); // Unfinished string
    expect(revealStyles("'a','b' 'c")).toBe("<s>'a'</s>,<s>'b'</s> <s>'c</s>"); // Unfinished strings after multiple
  });

  test("literal quotes: should be detected correctly and behave as strings", () => {
    expect(revealStyles("''';")).toBe("<s>'''</s><c>;</c>"); // Literal quote
    expect(revealStyles("'''';")).toBe("<s>'''';</s>"); // Unfinished string with literal quote
    expect(revealStyles("''''';")).toBe("<s>'''''</s><c>;</c>"); // String with literal quote
    expect(revealStyles("'''';';")).toBe("<s>'''';'</s><c>;</c>"); // String starting with literal quote
    expect(revealStyles("';'''';")).toBe("<s>';''''</s><c>;</c>"); // String ending with literal quote
    expect(revealStyles("''''''''''';")).toBe("<s>'''''''''''</s><c>;</c>"); // String with multiple literal quotes
    expect(revealStyles("'''' ''' '''';")).toBe("<s>'''' ''' ''''</s><c>;</c>"); // String with spaced literal quotes
  });

  test("comments: should be detected correctly", () => {
    expect(revealStyles("; a b")).toBe("<c>; a b</c>"); // Comment
    expect(revealStyles(";; ;;")).toBe("<c>;; ;;</c>"); // Comment symbols inside comment
    expect(revealStyles("NOP ;")).toBe("<i>NOP</i> <c>;</c>"); // Comment after instruction
    expect(revealStyles("';'")).toBe("<s>';'</s>"); // Comment symbol inside string
    expect(revealStyles("';")).toBe("<s>';</s>"); // Comment symbol inside unfinished string
    expect(revealStyles("';';")).toBe("<s>';'</s><c>;</c>"); // Comment after string
    expect(revealStyles(";';'")).toBe("<c>;';'</c>"); // String syntax inside comment
  });

});
