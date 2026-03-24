export interface BenchmarkOptions {
  suite: string;
  provider: string;
  model?: string;
  batch: boolean;
}

export function parseArgs(argv: string[]): BenchmarkOptions {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith("--")
      ? argv[idx + 1]
      : undefined;
  };

  return {
    suite: getFlag("suite") ?? "all",
    provider: getFlag("provider") ?? "all",
    model: getFlag("model"),
    batch: argv.includes("--batch"),
  };
}
