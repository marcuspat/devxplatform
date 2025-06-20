import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import fse from 'fs-extra';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJson(filePath: string, data: any, spaces = 2): Promise<void> {
  const content = JSON.stringify(data, null, spaces);
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await fse.copy(src, dest);
}

export async function emptyDir(dirPath: string): Promise<void> {
  await fse.emptyDir(dirPath);
}

export async function findFiles(pattern: string, options?: glob.GlobOptions): Promise<string[]> {
  return glob(pattern, options);
}

export async function readDir(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile())
    .map(entry => entry.name);
}

export async function readDirRecursive(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        files.push(path.relative(dirPath, fullPath));
      }
    }
  }
  
  await traverse(dirPath);
  return files;
}

export async function getFileStats(filePath: string): Promise<fs.Stats> {
  return fs.stat(filePath);
}

export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await getFileStats(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  await fs.symlink(target, linkPath);
}

export async function chmod(filePath: string, mode: number): Promise<void> {
  await fs.chmod(filePath, mode);
}

export function resolveRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

export function getBasename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

export function isAbsolute(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

export function normalize(filePath: string): string {
  return path.normalize(filePath);
}

export async function ensureFile(filePath: string): Promise<void> {
  await fse.ensureFile(filePath);
}

export async function move(src: string, dest: string): Promise<void> {
  await fse.move(src, dest);
}

export async function remove(filePath: string): Promise<void> {
  await fse.remove(filePath);
}

export function createReadStream(filePath: string): fs.ReadStream {
  return fse.createReadStream(filePath);
}

export function createWriteStream(filePath: string): fs.WriteStream {
  return fse.createWriteStream(filePath);
}

// Template-specific utilities
export async function processTemplate(
  templatePath: string,
  outputPath: string,
  data: Record<string, any>,
  processFunc: (content: string, data: Record<string, any>) => string,
): Promise<void> {
  const content = await fs.readFile(templatePath, 'utf-8');
  const processed = processFunc(content, data);
  await ensureDir(getDirname(outputPath));
  await fs.writeFile(outputPath, processed, 'utf-8');
}

export async function copyTemplateDir(
  srcDir: string,
  destDir: string,
  options?: {
    filter?: (src: string) => boolean;
    transform?: (content: string, filePath: string) => string;
  },
): Promise<void> {
  await fse.copy(srcDir, destDir, {
    filter: options?.filter,
    ...(options?.transform && {
      transform: (src, dest) => {
        return fse.createReadStream(src)
          .pipe(through2((chunk, enc, callback) => {
            const content = chunk.toString();
            const transformed = options.transform!(content, src);
            callback(null, Buffer.from(transformed));
          }))
          .pipe(fse.createWriteStream(dest));
      },
    }),
  });
}