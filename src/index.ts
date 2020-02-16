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
    target: ts.ScriptTarget.ES2018,
    module: ts.ModuleKind.CommonJS,
    lib: ['es2019'],
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noUnusedLocals: true,
    noUnusedParameters: true,
    sourceMap: true,
    declaration: true,
    declarationMap: true,
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    typeRoots: [
      'node_modules/@types',
      './packages/folio-build-utils/jest/typings',
    ],
    types: ['node', 'jest'],
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
      ts.TypeFormatFlags.NoTruncation |
        ts.TypeFormatFlags.WriteArrayAsGenericType |
        ts.TypeFormatFlags.UseStructuralFallback |
        ts.TypeFormatFlags.WriteTypeArgumentsOfSignature |
        ts.TypeFormatFlags.UseFullyQualifiedType |
        ts.TypeFormatFlags.SuppressAnyReturnType |
        ts.TypeFormatFlags.MultilineObjectLiterals |
        ts.TypeFormatFlags.WriteClassExpressionAsTypeLiteral |
        ts.TypeFormatFlags.UseTypeOfFunction |
        ts.TypeFormatFlags.OmitParameterModifiers |
        ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
        ts.TypeFormatFlags.AllowUniqueESSymbolType |
        ts.TypeFormatFlags.InTypeAlias

      // ts.TypeFormatFlags.InTypeAlias |
      //   ts.TypeFormatFlags.InFirstTypeArgument |
      //   ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
      //   ts.TypeFormatFlags.InFirstTypeArgument |
      //   ts.TypeFormatFlags.MultilineObjectLiterals
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

export function getTypeDefs(testPath: string, rawSourceCode: string) {
  const sourceCode = preProcessSourceCode(rawSourceCode);
  const tempPath = writeTempSource(testPath, sourceCode);
  const typeInfo = generateTypeInfo(tempPath);
  unlinkSync(tempPath);

  const ret = typeInfo
    .map(t => {
      return `type ${t.name.replace(typeNamePrefix, '')} = ${t.typeDef}`;
    })
    .join('\n\n');

  return ret;
}
