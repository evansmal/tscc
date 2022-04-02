import { rmSync, readFileSync, writeFileSync } from "fs";
import { argv } from 'process';
import { execSync } from "child_process";

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Generator from "./generator.js";

function assemble(source: string, output_filepath: string) {
    writeFileSync(`${output_filepath}.s`, source);
    execSync(`gcc -o ${output_filepath} ${output_filepath}.s`);
    rmSync(`${output_filepath}.s`);
}

function run(input_filepath: string, output_filepath: string) {
    const input = readFileSync(input_filepath).toString().trim();
    //console.log("Input: \n", input);
    //console.log("Lexer: \n", Lexer.lex(input));
    //console.log("Parser: \n", JSON.stringify(Parser.parse(Lexer.getScanner(Lexer.lex(input))), null, 4));
    //console.log("Generator: \n", JSON.stringify(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input)))), null, 4));
    //console.log("Emitter: \n", Generator.emit(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input))))));
    try {
        const output = Generator.emit(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input)))));
        assemble(output, output_filepath);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
    process.exit(0);
}

function main() {
    const input_filepath = argv[2];
    const output_filepath = input_filepath.replace(/\.[^/.]+$/, "");
    run(input_filepath, output_filepath);
}

main();
