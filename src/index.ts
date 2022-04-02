import { rmSync, readFileSync, writeFileSync } from "fs";
import { argv } from 'process';
import { execSync } from "child_process";

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Generator from "./generator.js";

function assemble(source: string, output_filepath: string) {
    execSync(`gcc -o ${output_filepath} -xassembler -`, { stdio: ['pipe', 'pipe', 'ignore'], input: source });
}

function run(input_filepath: string, output_filepath: string) {
    const input = readFileSync(input_filepath).toString().trim();
    let asm = "";
    try {
        asm = Generator.emit(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input)))));
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    console.log(asm);

    try {
        assemble(asm, output_filepath)
    } catch (e) {
        console.error(e);
        process.exit(2);
    }

    process.exit(0);
}

function main() {
    const input_filepath = argv[2];
    const output_filepath = input_filepath.replace(/\.[^/.]+$/, "");
    run(input_filepath, output_filepath);
}

main();
