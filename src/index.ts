import { argv } from "process";
import { parseArgs, ParseArgsConfig } from "node:util";

import { tscc, CompilerOptions } from "./entrypoint.js";

type ArgumentValue = string | boolean | (string | boolean)[];

interface NamedArguments {
    [longOption: string]: ArgumentValue | undefined;
}

function createCompilerOptionsFromArgs(argv: string[]): CompilerOptions {
    const opts: ParseArgsConfig = {
        args: argv,
        allowPositionals: true,
        options: {
            input: {
                type: "boolean",
                default: false
            },
            lex: {
                type: "boolean",
                default: false
            },
            ast: {
                type: "boolean",
                default: false
            },
            eval: {
                type: "boolean",
                default: false
            },
            ir: {
                type: "boolean",
                default: false
            },
            asm: {
                type: "boolean",
                default: false
            },
            out: {
                type: "boolean",
                default: false
            },
            output: {
                type: "string",
                short: "o"
            }
        }
    };
    const args = parseArgs(opts);
    const positionals: string[] = args.positionals;
    const values: NamedArguments = args.values;

    const input_filepath = positionals[0];
    const output_filepath = values["output"]
        ? (values["output"] as string)
        : input_filepath.replace(/\.[^/.]+$/, "");

    const options: CompilerOptions = {
        input_filepath,
        output_filepath,
        show_input: values["input"] as boolean,
        show_lexer: values["lex"] as boolean,
        show_ast: values["ast"] as boolean,
        evaluate_ast: values["eval"] as boolean,
        show_ir: values["ir"] as boolean,
        show_asm: values["asm"] as boolean,
        show_output: values["out"] as boolean
    };

    return options;
}

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
