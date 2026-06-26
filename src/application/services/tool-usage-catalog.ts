import { ALL_KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";
import type { SpecRegistry } from "./spec-registry.js";

export function buildToolUsageText(registry: SpecRegistry): string {
  const byTool = new Map(
    registry
      .listByDocType("core.tool")
      .filter(
        (doc) =>
          typeof doc.frontmatter.tool === "string" &&
          doc.frontmatter.tool.length > 0,
      )
      .map((doc) => [doc.frontmatter.tool as string, doc] as const),
  );

  const sections: string[] = [];
  for (const name of ALL_KERNEL_TOOL_NAMES) {
    const doc = byTool.get(name);
    if (doc) {
      sections.push(`### ${name}\n\n${doc.body.trim()}`);
    }
  }

  return sections.join("\n\n");
}
