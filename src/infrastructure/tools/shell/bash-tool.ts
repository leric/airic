import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateTail,
} from "../common/truncate.js";

export type BashToolInput = {
  command: string;
  timeout?: number;
};

export async function executeBashTool(
  input: BashToolInput,
  context: AiricToolContext,
  signal?: AbortSignal,
  onUpdate?: (update: { content: AiricToolResult["content"]; details?: Record<string, unknown> }) => void,
): Promise<AiricToolResult> {
  if (signal?.aborted) {
    throw new Error("Operation aborted");
  }

  try {
    await access(context.cwd, constants.F_OK);
  } catch {
    throw new Error(
      `Working directory does not exist: ${context.cwd}\nCannot execute bash commands.`,
    );
  }

  const shell = process.env.SHELL ?? "/bin/bash";
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(shell, ["-c", input.command], {
      cwd: context.cwd,
      detached: process.platform !== "win32",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let timeoutHandle: NodeJS.Timeout | undefined;
    const onAbort = () => {
      if (child.pid) {
        try {
          process.kill(-child.pid);
        } catch {
          child.kill();
        }
      }
    };

    const appendOutput = (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      stderr += chunk;
      if (onUpdate) {
        const combined = stdout + (stderr && stdout ? `\n${stderr}` : stderr);
        const snapshot = truncateTail(combined || "");
        onUpdate({
          content: [{ type: "text", text: snapshot.content || "" }],
          details: snapshot.truncated ? { truncation: snapshot } : undefined,
        });
      }
    };

    child.stdout?.on("data", appendOutput);
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    if (input.timeout !== undefined && input.timeout > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        onAbort();
      }, input.timeout * 1000);
    }

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    child.on("error", (error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });

    child.on("close", (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(new Error("Operation aborted"));
        return;
      }
      if (timedOut) {
        reject(new Error(`timeout:${input.timeout}`));
        return;
      }
      resolve(code);
    });
  }).catch((error: unknown) => {
    const combined = [stdout, stderr].filter(Boolean).join("\n");
    if (error instanceof Error && error.message.startsWith("timeout:")) {
      const timeoutSecs = error.message.split(":")[1];
      throw new Error(
        appendStatus(combined, `Command timed out after ${timeoutSecs} seconds`),
      );
    }
    if (error instanceof Error && error.message === "Operation aborted") {
      throw new Error(appendStatus(combined, "Command aborted"));
    }
    throw error;
  });

  const combined = [stdout, stderr].filter(Boolean).join("\n");
  const truncation = truncateTail(combined || "");
  let outputText = truncation.content || "(no output)";
  let details: Record<string, unknown> | undefined;

  if (truncation.truncated) {
    details = { truncation };
    const startLine = truncation.totalLines - truncation.outputLines + 1;
    const endLine = truncation.totalLines;
    if (truncation.lastLinePartial) {
      outputText += `\n\n[Showing last ${formatSize(truncation.outputBytes)} of line ${endLine}. Use read or refine command.]`;
    } else if (truncation.truncatedBy === "lines") {
      outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines}. Output truncated.]`;
    } else {
      outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Output truncated.]`;
    }
  }

  if (exitCode !== 0 && exitCode !== null) {
    throw new Error(appendStatus(outputText, `Command exited with code ${exitCode}`));
  }

  return {
    content: [{ type: "text", text: outputText }],
    details,
  };
}

function appendStatus(text: string, status: string): string {
  return text ? `${text}\n\n${status}` : status;
}

export const BASH_TOOL_DESCRIPTION = `Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). Optionally provide a timeout in seconds.`;

export const BASH_TOOL_SCHEMA = {
  type: "object",
  properties: {
    command: {
      type: "string",
      description: "Bash command to execute",
    },
    timeout: {
      type: "number",
      description: "Timeout in seconds (optional, no default timeout)",
    },
  },
  required: ["command"],
};
