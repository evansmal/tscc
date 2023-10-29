import { readFileSync } from "fs";
import { execSync } from "child_process";

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Evaluator from "./evaluator.js";
import * as IR from "./ir.js";
import * as Generator from "./generator.js";

const PARSE_ERR_CODE = 0x02;

function assemble(source: string, output_filepath: string) {
    const _ = execSync(`gcc -o ${output_filepath} -xassembler -lc -`, {
        stdio: ["pipe", "pipe", "pipe"],
        input: source
    });
    // console.log(_);
}

export interface CompilerOptions {
    input_filepath: string;
    output_filepath: string;
    show_input: boolean;
    show_lexer: boolean;
    show_ast: boolean;
    evaluate_ast: boolean;
    show_ir: boolean;
    show_asm: boolean;
    show_output: boolean;
}

export function tscc(opts: CompilerOptions) {
    const input = readFileSync(opts.input_filepath).toString().trim();
    if (opts.show_input) console.log(input);
    let output = "";
    try {
        const tokens = Lexer.lex(input);
        if (opts.show_lexer) console.log(tokens);

        const ast = Parser.parse(Lexer.getScanner(tokens)).unwrapOrPanic(
            (err) => {
                console.log(err.toString());
                process.exit(PARSE_ERR_CODE);
            }
        );
        if (opts.show_ast) console.log(Parser.toString(ast));

        if (opts.evaluate_ast) process.exit(Evaluator.walk(ast));

        const ir = IR.lower(ast);
        if (opts.show_ir) console.log(IR.toString(ir));

        const asm = Generator.generate(ir);
        if (opts.show_asm) console.log(Generator.toString(asm));

        output = Generator.emit(asm);
        if (opts.show_output) console.log(output);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    try {
        assemble(output, opts.output_filepath);
    } catch (e) {
        console.error(e);
        process.exit(2);
    }

    process.exit(0);
}
