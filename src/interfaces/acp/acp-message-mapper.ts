import type * as acp from "@agentclientprotocol/sdk";

export function extractUserMessage(prompt: acp.ContentBlock[]): string {
  const parts: string[] = [];

  for (const block of prompt) {
    if (block.type === "text") {
      parts.push(block.text);
      continue;
    }

    if (block.type === "resource_link") {
      parts.push(`[${block.name ?? block.uri}]`);
      continue;
    }

    if (block.type === "resource") {
      const resource = block.resource;
      if ("text" in resource && typeof resource.text === "string") {
        parts.push(resource.text);
      } else if ("blob" in resource && typeof resource.blob === "string") {
        parts.push(resource.blob);
      }
    }
  }

  return parts.join("\n\n").trim();
}
