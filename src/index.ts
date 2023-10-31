import { argv } from "process";

import { createCompilerOptionsFromArgs } from "./args.js";
import { tscc } from "./entrypoint.js";

function main() {
    if (argv.length < 3) {
        console.log(`Got ${argv.length - 2} arguments but expected at least 1`);
        console.log(
            `Usage: tscc <input_filepath> [--input] [--lex] [--ast] [--ir] [--asm] [--out]`
        );
        process.exit(0);
    }
    tscc(createCompilerOptionsFromArgs(process.argv.slice(2)));
}

main();
