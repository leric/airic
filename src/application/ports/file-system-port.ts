export interface FileSystemPort {
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
}
