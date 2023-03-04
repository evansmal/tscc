import { readFileSync } from "fs";
import { argv } from "process";
import { execSync } from "child_process";

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Evaluator from "./evaluator.js";
import * as IR from "./ir.js";
import * as Generator from "./generator.js";

function assemble(source: string, output_filepath: string) {
    const _ = execSync(`gcc -o ${output_filepath} -xassembler -`, {
        stdio: ["pipe", "pipe", "pipe"],
        input: source
    });
    //console.log(_);
}

interface Options {
    show_input: boolean;
    show_lexer: boolean;
    show_ast: boolean;
    evaluate_ast: boolean;
    show_ir: boolean;
    show_asm: boolean;
    show_output: boolean;
}

const PARSE_ERR_CODE = 0x02;

function run(input_filepath: string, output_filepath: string, opts: Options) {
    const input = readFileSync(input_filepath).toString().trim();
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

        if (opts.evaluate_ast) Evaluator.walk(ast);

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
        assemble(output, output_filepath);
    } catch (e) {
        console.error(e);
        process.exit(2);
    }

    process.exit(0);
}

function main() {
    if (argv.length < 3) {
        console.log(`Got ${argv.length - 2} arguments but expected at least 1`);
        console.log(
            `Usage: tscc <input_filepath> [--input] [--lex] [--ast] [--ir] [--asm] [--out]`
        );
        process.exit(0);
    }
    let input_filepath = "";
    const options: Options = {
        show_input: false,
        show_lexer: false,
        show_ast: false,
        evaluate_ast: false,
        show_ir: false,
        show_asm: false,
        show_output: false
    };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === "--input") options.show_input = true;
        else if (argv[i] === "--lex") options.show_lexer = true;
        else if (argv[i] === "--ast") options.show_ast = true;
        else if (argv[i] === "--eval") options.evaluate_ast = true;
        else if (argv[i] === "--ir") options.show_ir = true;
        else if (argv[i] === "--asm") options.show_asm = true;
        else if (argv[i] === "--out") options.show_output = true;
        else input_filepath = argv[i];
    }
    const output_filepath = input_filepath.replace(/\.[^/.]+$/, "");
    run(input_filepath, output_filepath, options);
}

main();
