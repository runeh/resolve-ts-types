import ts from 'typescript';

function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  // let output: DocEntry[] = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    // console.log('./' + sourceFile.fileName);
    if (fileNames.includes('./' + sourceFile.fileName)) {
      const syms = checker.getSymbolsInScope(
        sourceFile,
        ts.SymbolFlags.TypeAlias
      );
      // .filter(e => e.name === 'lol' || e.name === 'lal');

      for (const sym of syms) {
        console.log(sym);

        const type = checker.getDeclaredTypeOfSymbol(sym);
        const typeAsString = checker.typeToString(
          type,
          sourceFile
          // // We need this TypeFormatFlags to avoid getting
          // // the type alias we created back
          // ts.TypeFormatFlags.InTypeAlias
        );

        console.log(`type ${sym.name} = ${typeAsString}`);
      }
    }
  }
}

generateDocumentation(process.argv.slice(2), {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
});
