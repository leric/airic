export type MarkdownDocument = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
};
