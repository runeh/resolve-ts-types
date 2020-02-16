import ts from 'typescript';
import { dirname, basename, join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';

const typeNamePrefix = '__rfh_checkit__';

function writeTempSource(testPath: string, sourceCode: string) {
  const testDir = dirname(testPath);
  const testFile = basename(testPath);
  const tempPath = join(testDir, `_test.${testFile}`);
  writeFileSync(tempPath, sourceCode, 'utf-8');
  return tempPath;
}

function generateTypeInfo(programPath: string) {
  const program = ts.createProgram([programPath], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  });

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
      sourceFile,
      ts.TypeFormatFlags.InTypeAlias
    );
    return { name: symbol.name, typeDef: typeAsString };
  });

  return typeDefs;
}

function preProcessSourceCode(sourceCode: string) {
  return sourceCode.replace(/type\s+(\S+)\s?=/g, (_a, typeName) => {
    return `type ${typeNamePrefix}${typeName} = `;
  });
}

function main(testPath: string, rawSourceCode: string) {
  const sourceCode = preProcessSourceCode(rawSourceCode);
  const tempPath = writeTempSource(testPath, sourceCode);
  const typeInfo = generateTypeInfo(tempPath);
  unlinkSync(tempPath);

  for (const t of typeInfo) {
    console.log(`type ${t.name.replace(typeNamePrefix, '')} = ${t.typeDef}`);
  }
}

main(
  '/Users/runeh/Documents/prosjekter/jest-ts-type-snapshot/boop.ts',
  `
type x = {name: string};
type y = () => Promise<string>;

`
);
