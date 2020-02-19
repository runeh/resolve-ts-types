import ts, { CompilerOptions, CompilerHost } from 'typescript';
import { dirname, join } from 'path';
import { resolveConfig, format } from 'prettier';

function loadTsConfig(sourceDir: string) {
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    useCaseSensitiveFileNames: true,
  };

  const maybeConfigFile = ts.findConfigFile(
    sourceDir,
    ts.sys.fileExists,
    'tsconfig.json',
  );

  if (maybeConfigFile === undefined) {
    throw new Error('setOptions: Cannot find tsconfig.json');
  }

  const configFile = ts.readConfigFile(maybeConfigFile, ts.sys.readFile);

  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    parseConfigHost,
    dirname(maybeConfigFile),
  );

  return compilerOptions;
}

function createHost(
  options: CompilerOptions,
  inMemoryFiles: Record<string, ts.SourceFile> = {},
) {
  const realHost = ts.createCompilerHost(options, true);
  const host: CompilerHost = {
    ...realHost,
    getSourceFile: (fileName, ...rest) =>
      inMemoryFiles[fileName] !== undefined
        ? inMemoryFiles[fileName]
        : realHost.getSourceFile(fileName, ...rest),
  };

  return host;
}

function getTempSourcePath(sourceDir: string) {
  const randomPart = Math.random()
    .toString()
    .replace('.', '');

  return join(sourceDir, `test-${randomPart}.ts`);
}

function generateTypeInfo(
  programPath: string,
  sourceCode: string,
  compilerOptions: ts.CompilerOptions,
) {
  const sourceFiles: Record<string, ts.SourceFile> = {
    [programPath]: ts.createSourceFile(
      programPath,
      sourceCode,
      ts.ScriptTarget.ES2015,
    ),
  };

  const host = createHost(compilerOptions, sourceFiles);
  const program = ts.createProgram([programPath], compilerOptions, host);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(programPath);

  if (!sourceFile) {
    throw new Error(`Source file not found for path "${programPath}"`);
  }

  const symbolsToPrint = new Set<string>();

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      symbolsToPrint.add(String(node.name.escapedText));
    }
  });

  const symbols = checker
    .getSymbolsInScope(sourceFile, ts.SymbolFlags.TypeAlias)
    .filter(e => symbolsToPrint.has(e.name));

  const typeDefs = symbols.map(symbol => {
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const typeAsString = checker.typeToString(
      type,
      sourceFile,
      ts.TypeFormatFlags.InTypeAlias | ts.TypeFormatFlags.NoTruncation,
    );
    return { name: symbol.name, typeDef: typeAsString };
  });

  return typeDefs;
}

function prettifySource(dirPath: string, sourceCode: string) {
  const config = resolveConfig.sync(dirPath);
  return format(sourceCode, { parser: 'typescript', ...(config || {}) });
}

function preProcessSourceCode(sourceCode: string) {
  return sourceCode.replace(/type\s+(\S+)\s?=/g, (_a, typeName) => {
    return `type ${typeName} = `;
  });
}

export function getTypeDefs(sourceDir: string, rawSourceCode: string) {
  const config = loadTsConfig(sourceDir);
  const sourceCode = preProcessSourceCode(rawSourceCode);
  const tempPath = getTempSourcePath(sourceDir);
  const typeInfo = generateTypeInfo(tempPath, sourceCode, config.options);
  const ret = typeInfo.map(t => `type ${t.name} = ${t.typeDef}`).join('\n');
  return prettifySource(sourceDir, ret);
}

function sourceTemplate(
  strOrTpl: string | TemplateStringsArray,
  ...args: any[]
) {
  return typeof strOrTpl === 'string'
    ? strOrTpl
    : strOrTpl.map((str, i) => str + (args[i] || '')).join('');
}

export function typeGetter(sourceDir: string, preamble?: string) {
  return (strOrTpl: string | TemplateStringsArray, ...args: any[]) => {
    const source = sourceTemplate(strOrTpl, args);
    const fullSource =
      preamble !== undefined ? `${preamble}\n\n${source}` : source;
    return getTypeDefs(sourceDir, fullSource);
  };
}
