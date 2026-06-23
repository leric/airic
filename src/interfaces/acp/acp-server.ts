import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";
import { NodeFileSystem } from "../../infrastructure/fs/node-file-system.js";
import { AcpAdapter, createAcpAgentApp } from "./acp-adapter.js";

export function startAcpServer(): void {
  const fs = new NodeFileSystem();
  const adapter = new AcpAdapter(fs);
  const app = createAcpAgentApp(adapter);

  const input = Writable.toWeb(process.stdout);
  const output = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  const stream = acp.ndJsonStream(input, output);

  app.connect(stream);
}
