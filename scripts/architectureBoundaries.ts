import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ArchitectureViolation = {
  file: string;
  rule: "domain-purity" | "infrastructure-ui" | "cross-feature-internal";
  detail: string;
};

type CheckOptions = { files?: Map<string, string>; baseline?: ArchitectureViolation[] };

async function collectSourceFiles(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const srcRoot = path.join(root, "src");
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
        files.set(path.relative(root, absolutePath).replaceAll("\\", "/"), await readFile(absolutePath, "utf8"));
      }
    }
  }
  await visit(srcRoot);
  return files;
}

function importedSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)].map((match) => match[1]);
}

export async function checkArchitectureBoundaries(root: string, options: CheckOptions = {}): Promise<ArchitectureViolation[]> {
  const files = options.files ?? await collectSourceFiles(root);
  const violations: ArchitectureViolation[] = [];
  for (const [file, source] of files) {
    const normalizedFile = file.replaceAll("\\", "/");
    const imports = importedSpecifiers(source);
    if (normalizedFile.startsWith("src/domain/")) {
      for (const specifier of imports) {
        if (specifier === "react" || specifier.startsWith("react/") || specifier === "firebase" || specifier.startsWith("firebase/")) {
          violations.push({ file: normalizedFile, rule: "domain-purity", detail: specifier });
        }
      }
      if (/\b(window|document|navigator|localStorage|sessionStorage)\b/.test(source)) {
        violations.push({ file: normalizedFile, rule: "domain-purity", detail: "browser-global" });
      }
    }
    if (normalizedFile.startsWith("src/infrastructure/")) {
      for (const specifier of imports) {
        if (/(?:^|\/)components(?:\/|$)|(?:^|\/)features(?:\/[^/]+)?\/.*(?:View|Modal|Panel|Controls)/.test(specifier)) {
          violations.push({ file: normalizedFile, rule: "infrastructure-ui", detail: specifier });
        }
      }
    }
    const featureMatch = normalizedFile.match(/^src\/features\/([^/]+)\//);
    if (featureMatch) {
      const owner = featureMatch[1];
      for (const specifier of imports) {
        if (!specifier.startsWith(".")) continue;
        const targetPath = path.posix.normalize(path.posix.join(path.posix.dirname(normalizedFile), specifier));
        const targetMatch = targetPath.match(/^src\/features\/([^/]+)\/(.+)$/);
        if (targetMatch && targetMatch[1] !== owner && !/(?:^|\/)(index|public)(?:\.|$)/.test(targetMatch[2])) {
          violations.push({ file: normalizedFile, rule: "cross-feature-internal", detail: specifier });
        }
      }
    }
  }
  const baseline = options.baseline ?? (options.files ? [] : JSON.parse(await readFile(path.join(root, "scripts", "architecture-boundary-baseline.json"), "utf8")) as ArchitectureViolation[]);
  const baselineKeys = new Set(baseline.map((item) => `${item.file}|${item.rule}|${item.detail}`));
  return violations.filter((item) => !baselineKeys.has(`${item.file}|${item.rule}|${item.detail}`)).sort((left, right) => left.file.localeCompare(right.file) || left.rule.localeCompare(right.rule) || left.detail.localeCompare(right.detail));
}
