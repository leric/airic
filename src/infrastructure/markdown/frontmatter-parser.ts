import matter from "gray-matter";

export type ParsedMarkdown = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function parseMarkdownFrontmatter(raw: string): ParsedMarkdown {
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}
