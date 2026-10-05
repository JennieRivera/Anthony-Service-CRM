// Tests for portal upload file-type validation (src/lib/portal/fileTypes.ts).
// Run with:
//   npx tsx src/lib/portal/fileTypes.test.ts

import assert from "node:assert/strict";
import { detectPortalFileKind, validatePortalFile } from "./fileTypes";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

const pdf = bytes("%PDF-1.7\n", [0, 0, 0]);
const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF");
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "IHDR");
const webp = bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 ");
const heic = bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0]);
const doc = bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], "rest");
const docx = bytes([0x50, 0x4b, 0x03, 0x04], "....[Content_Types].xml....word/document.xml");
const zip = bytes([0x50, 0x4b, 0x03, 0x04], "....evil/payload.bin");
const html = bytes("<html><script>alert(1)</script>");
const exe = bytes("MZ", [0x90, 0, 3, 0]);

assert.equal(detectPortalFileKind(pdf), "pdf");
assert.equal(detectPortalFileKind(jpeg), "jpeg");
assert.equal(detectPortalFileKind(png), "png");
assert.equal(detectPortalFileKind(webp), "webp");
assert.equal(detectPortalFileKind(heic), "heic");
assert.equal(detectPortalFileKind(doc), "doc");
assert.equal(detectPortalFileKind(docx), "docx");
assert.equal(detectPortalFileKind(zip), null);
assert.equal(detectPortalFileKind(html), null);
assert.equal(detectPortalFileKind(exe), null);
assert.equal(detectPortalFileKind(new Uint8Array()), null);

// Accepted when content and extension agree (any letter case).
for (const [name, b] of [["w2.PDF", pdf], ["id.jpg", jpeg], ["id.JPEG", jpeg], ["a.png", png], ["a.webp", webp], ["foto.HEIC", heic], ["foto.heif", heic], ["carta.doc", doc], ["carta.docx", docx]] as const) {
  const r = validatePortalFile(name, b);
  assert.ok(r.ok, name);
}

// Rejected: disguised or unsupported files.
for (const [name, b] of [
  ["w2.pdf", html],      // HTML renamed to .pdf
  ["w2.pdf", exe],       // executable renamed to .pdf
  ["id.jpg", pdf],       // real PDF with an image extension
  ["carta.docx", zip],   // arbitrary zip renamed to .docx
  ["notes.txt", pdf],    // extension not allowed
  ["noextension", pdf],
  ["page.html", html],
] as const) {
  assert.equal(validatePortalFile(name, b).ok, false, name);
}

const ok = validatePortalFile("w2.pdf", pdf);
assert.ok(ok.ok && ok.contentType === "application/pdf");

console.log("fileTypes.test.ts: all file-type assertions passed.");
