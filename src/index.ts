import ts from 'typescript';
import { dirname, basename, join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { resolveConfig, format } from 'prettier';

function loadTsConfig(dirPath: string) {
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    useCaseSensitiveFileNames: true,
  };

  const maybeConfigFile = ts.findConfigFile(
    dirPath,
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

function writeTempSource(testPath: string, sourceCode: string) {
  const testDir = dirname(testPath);
  const testFile = basename(testPath);
  const tempPath = join(testDir, `_test.${testFile}`);
  writeFileSync(tempPath, sourceCode, 'utf-8');
  return tempPath;
}

function generateTypeInfo(
  programPath: string,
  compilerOptions: ts.CompilerOptions,
) {
  const program = ts.createProgram([programPath], compilerOptions);

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

export function getTypeDefs(testPath: string, rawSourceCode: string) {
  const config = loadTsConfig(testPath);

  const sourceCode = preProcessSourceCode(rawSourceCode);
  const tempPath = writeTempSource(testPath, sourceCode);
  const typeInfo = generateTypeInfo(tempPath, config.options);
  unlinkSync(tempPath);

  const ret = typeInfo.map(t => `type ${t.name} = ${t.typeDef}`).join('\n');

  return prettifySource(dirname(testPath), ret);
}

function sourceTemplate(
  strOrTpl: string | TemplateStringsArray,
  ...args: any[]
) {
  return typeof strOrTpl === 'string'
    ? strOrTpl
    : strOrTpl.map((str, i) => str + (args[i] || '')).join('');
}

export function typeGetter(testPath: string, preamble?: string) {
  return (strOrTpl: string | TemplateStringsArray, ...args: any[]) => {
    const source = sourceTemplate(strOrTpl, args);
    const fullSource =
      preamble !== undefined ? `${preamble}\n\n${source}` : source;
    return getTypeDefs(testPath, fullSource);
  };
}
