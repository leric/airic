import * as acp from "@agentclientprotocol/sdk";
import type { KernelSlashCommand } from "../../application/services/command-catalog.js";

export function toAcpAvailableCommands(
  commands: KernelSlashCommand[],
): acp.AvailableCommand[] {
  return commands.map((command) => ({
    name: command.name,
    description: command.description,
    input: command.inputHint
      ? {
          hint: command.inputHint,
        }
      : null,
  }));
}

export async function notifyAvailableCommands(
  sessionId: string,
  cx: acp.AgentContext,
  commands: KernelSlashCommand[],
): Promise<void> {
  await cx.notify(acp.methods.client.session.update, {
    sessionId,
    update: {
      sessionUpdate: "available_commands_update",
      availableCommands: toAcpAvailableCommands(commands),
    },
  });
}
