export interface BenchmarkOptions {
  suites: string[];
  providers: string[];
  models: string[];
  personas: string[];
  batch: boolean;
  configPath?: string;
}

export function parseArgs(argv: string[]): BenchmarkOptions {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith("--")
      ? argv[idx + 1]
      : undefined;
  };

  const splitComma = (value: string | undefined): string[] =>
    value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const suite = getFlag("suite");
  const provider = getFlag("provider");

  return {
    suites: suite ? [suite] : ["all"],
    providers: provider ? [provider] : ["all"],
    models: splitComma(getFlag("model")),
    personas: splitComma(getFlag("persona")),
    batch: argv.includes("--batch"),
    configPath: getFlag("config"),
  };
}
