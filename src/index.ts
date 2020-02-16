import ts from 'typescript';
import { dirname, basename, join } from 'path';
import { writeFileSync } from 'fs';

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

  const symbols = checker.getSymbolsInScope(
    sourceFile,
    ts.SymbolFlags.TypeAlias
  );

  const typeDefs = symbols.map(symbol => {
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const typeAsString = checker.typeToString(type, sourceFile);
    return { name: symbol.name, typeDef: typeAsString };
  });

  return typeDefs;
}

function main(testPath: string, sourceCode: string) {
  const tempPath = writeTempSource(testPath, sourceCode);
  console.log('temppath', tempPath);
  const typeInfo = generateTypeInfo(tempPath);
  // unlinkSync(tempPath);

  for (const t of typeInfo) {
    console.log(`type ${t.name} = ${t.typeDef}`);
  }
}

main(
  '/Users/runeh/Documents/prosjekter/jest-ts-type-snapshot/boop.ts',
  `
type x = {name: string}

`
);

// function generateDocumentation(
//   fileNames: string[],
//   options: ts.CompilerOptions
// ): void {
//   // Build a program using the set of root file names in fileNames
//   let program = ts.createProgram(fileNames, options);

//   // Get the checker, we will use it to find more about classes
//   let checker = program.getTypeChecker();
//   // let output: DocEntry[] = [];

//   // Visit every sourceFile in the program
//   for (const sourceFile of program.getSourceFiles()) {
//     // console.log('./' + sourceFile.fileName);
//     if (fileNames.includes('./' + sourceFile.fileName)) {
//       const syms = checker.getSymbolsInScope(
//         sourceFile,
//         ts.SymbolFlags.TypeAlias
//       );
//       // .filter(e => e.name === 'lol' || e.name === 'lal');

//       for (const sym of syms) {
//         console.log(sym);

//         const type = checker.getDeclaredTypeOfSymbol(sym);
//         const typeAsString = checker.typeToString(
//           type,
//           sourceFile
//           // // We need this TypeFormatFlags to avoid getting
//           // // the type alias we created back
//           // ts.TypeFormatFlags.InTypeAlias
//         );

//         console.log(`type ${sym.name} = ${typeAsString}`);
//       }
//     }
//   }
// }

// generateDocumentation(process.argv.slice(2), {
//   target: ts.ScriptTarget.ES5,
//   module: ts.ModuleKind.CommonJS,
// });
