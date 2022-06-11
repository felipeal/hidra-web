export function mockBinaryFile(fileName: string, bytes: Uint8Array): File {
  const fileBuffer = new Uint8Array(bytes);
  const file = new File([fileBuffer], fileName);
  file.arrayBuffer = jest.fn().mockResolvedValueOnce(fileBuffer);
  return file;
}

export function mockTextFile(fileName: string, utf8Text: string): File {
  const utf8EncodedSource = new TextEncoder().encode(utf8Text);
  return mockBinaryFile(fileName, utf8EncodedSource);
}
