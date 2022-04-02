import { rmSync, readFileSync, writeFileSync } from "fs";
import { argv } from 'process';
import { execSync } from "child_process";

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Generator from "./generator.js";

function assemble(source: string, output_filepath: string) {
    execSync(`gcc -o ${output_filepath} -xassembler -`, { stdio: ['pipe', 'pipe', 'ignore'], input: source });
}

interface Options {
    show_input: boolean;
    show_lexer: boolean;
    show_ast: boolean;
    show_asm: boolean;
    show_output: boolean;
}

function run(input_filepath: string, output_filepath: string, opts: Options) {
    const input = readFileSync(input_filepath).toString().trim();
    if (opts.show_input) console.log(input);
    let output = "";
    try {
        const tokens = Lexer.lex(input);
        if (opts.show_lexer) console.log(tokens);

        const ast = Parser.parse(Lexer.getScanner(tokens));
        if (opts.show_ast) console.log(Parser.toString(ast));

        const asm = Generator.generate(ast);
        if (opts.show_asm) console.log(asm);

        output = Generator.emit(asm);
        if (opts.show_output) console.log(output);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    try {
        assemble(output, output_filepath)
    } catch (e) {
        console.error(e);
        process.exit(2);
    }

    process.exit(0);
}

function main() {
    const input_filepath = argv[2];
    const options: Options = {
        show_input: false,
        show_lexer: false,
        show_ast: false,
        show_asm: false,
        show_output: false
    };
    const output_filepath = input_filepath.replace(/\.[^/.]+$/, "");
    for (let i = 3; i < argv.length; i++) {
        if (argv[i] === "--input") options.show_input = true;
        else if (argv[i] === "--lex") options.show_lexer = true;
        else if (argv[i] === "--ast") options.show_ast = true;
        else if (argv[i] === "--asm") options.show_asm = true;
    }
    run(input_filepath, output_filepath, options);
}

main();
