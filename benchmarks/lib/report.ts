import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function saveJson(data: unknown, filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
