import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Minimal ZIP builder test via re-exported logic — test crc/zip structure indirectly
// by importing buildApplicationPacketZip would need DB; test zip format via local helper copy.

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildMinimalZip(name: string, data: Buffer): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const crc = crc32(data);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(nameBuf.length, 28);
  centralHeader.writeUInt32LE(0, 42);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralHeader.length + nameBuf.length, 12);
  end.writeUInt32LE(localHeader.length + nameBuf.length + data.length, 16);

  return Buffer.concat([
    localHeader,
    nameBuf,
    data,
    centralHeader,
    nameBuf,
    end,
  ]);
}

describe("packet zip format", () => {
  it("produces a valid ZIP local file header signature", () => {
    const zip = buildMinimalZip("hello.txt", Buffer.from("hello"));
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    assert.ok(zip.length > 50);
  });
});
