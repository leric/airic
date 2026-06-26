import { DOCUMENT_TYPE_META_IDS } from "../../domain/document/document-id.js";
import type { SpecRegistry } from "./spec-registry.js";

export type ProcessActivation = "manual" | "suggested";

export type ProcessSpecIndex = {
  id: string;
  title: string;
  summary: string;
  triggers: string[];
  outputs?: string[];
  activation: ProcessActivation;
  path: string;
};

export function listProcesses(specRegistry: SpecRegistry): ProcessSpecIndex[] {
  return specRegistry
    .listByDocType("core.process")
    .filter((spec) => spec.id !== DOCUMENT_TYPE_META_IDS.process)
    .map((spec) => ({
      id: spec.id,
      title: readTitle(spec.frontmatter.title, spec.id),
      summary: readRequiredString(spec.frontmatter.summary, spec.id, "summary"),
      triggers: readStringArray(spec.frontmatter.triggers),
      outputs: readOptionalStringArray(spec.frontmatter.outputs),
      activation: readActivation(spec.frontmatter.activation),
      path: spec.path,
    }));
}

export function buildProcessIndexText(processes: ProcessSpecIndex[]): string {
  if (processes.length === 0) {
    return "No processes available.";
  }

  const lines: string[] = [];
  for (const process of processes) {
    lines.push(`- ${process.id}: ${process.summary}`);
    if (process.triggers.length > 0) {
      lines.push(`  Triggers: ${process.triggers.join("; ")}.`);
    }
    lines.push(`  Activation: ${process.activation}.`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function formatProcessListForUser(processes: ProcessSpecIndex[]): string {
  if (processes.length === 0) {
    return "No processes available.";
  }

  const lines: string[] = [];
  for (const process of processes) {
    lines.push(process.id);
    lines.push(`  ${process.summary}`);
    lines.push(`  Activation: ${process.activation}.`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function readTitle(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readRequiredString(
  value: unknown,
  id: string,
  field: string,
): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return `${id} (${field} not defined)`;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function readOptionalStringArray(value: unknown): string[] | undefined {
  const items = readStringArray(value);
  return items.length > 0 ? items : undefined;
}

function readActivation(value: unknown): ProcessActivation {
  if (value === "manual" || value === "suggested") {
    return value;
  }
  return "suggested";
}
