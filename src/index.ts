import ts from 'typescript';
import { dirname, basename, join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { resolveConfig, format } from 'prettier';

const typeNamePrefix = '__rfh_checkit__';

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
    'tsconfig.json'
  );

  if (maybeConfigFile == undefined) {
    throw new Error('setOptions: Cannot find tsconfig.json');
  }

  const configFile = ts.readConfigFile(maybeConfigFile, ts.sys.readFile);

  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    parseConfigHost,
    dirname(maybeConfigFile)
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
  compilerOptions: ts.CompilerOptions
) {
  const program = ts.createProgram([programPath], compilerOptions);

  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(programPath);

  if (!sourceFile) {
    throw new Error(`Source file not found for path "${programPath}"`);
  }

  const symbols = checker
    .getSymbolsInScope(sourceFile, ts.SymbolFlags.TypeAlias)
    .filter(symbol => symbol.name.startsWith(typeNamePrefix));

  const typeDefs = symbols.map(symbol => {
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const typeAsString = checker.typeToString(
      type,
      sourceFile
      // ts.TypeFormatFlags.InTypeAlias
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
    return `type ${typeNamePrefix}${typeName} = `;
  });
}

export function getTypeDefs(testPath: string, rawSourceCode: string) {
  const config = loadTsConfig(testPath);

  const sourceCode = preProcessSourceCode(rawSourceCode);
  const tempPath = writeTempSource(testPath, sourceCode);
  const typeInfo = generateTypeInfo(tempPath, config.options);
  unlinkSync(tempPath);

  const ret = typeInfo
    .map(t => {
      return `type ${t.name.replace(typeNamePrefix, '')} = ${t.typeDef}`;
    })
    .join('\n\n');

  return prettifySource(
    dirname(testPath),
    `
    ${rawSourceCode}
    
    /* Generated types: */

    ${ret}`
  );
}
