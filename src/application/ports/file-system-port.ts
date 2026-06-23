export type FileEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
};

export type TextSearchMatch = {
  path: string;
  line: number;
  text: string;
};

export interface FileSystemPort {
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  appendText(path: string, content: string): Promise<void>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  listEntries(path: string): Promise<FileEntry[]>;
  searchText(rootPath: string, query: string): Promise<TextSearchMatch[]>;
}
