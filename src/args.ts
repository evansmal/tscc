import { parseArgs, ParseArgsConfig } from "node:util";

import { CompilerOptions } from "./entrypoint.js";

type ArgumentValue = string | boolean | (string | boolean)[];

interface NamedArguments {
    [longOption: string]: ArgumentValue | undefined;
}

function getBoolean(args: NamedArguments, key: string): boolean {
    const value = args[key];
    if (value !== undefined && typeof value === "boolean") {
        return value;
    } else {
        throw new Error(`Expected ${key} to be boolean`);
    }
}

export function createCompilerOptionsFromArgs(argv: string[]): CompilerOptions {
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
        show_input: getBoolean(values, "input"),
        show_lexer: getBoolean(values, "lex"),
        show_ast: getBoolean(values, "ast"),
        evaluate_ast: getBoolean(values, "eval"),
        show_ir: getBoolean(values, "ir"),
        show_asm: getBoolean(values, "asm"),
        show_output: getBoolean(values, "out")
    };

    return options;
}
