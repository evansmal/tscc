
import { readFileSync } from "fs";
import { argv } from 'process';

import * as Lexer from "./lexer.js";
import * as Parser from "./parser.js";
import * as Generator from "./generator.js";

function main() {
    const input = readFileSync(argv[2]).toString().trim()
    console.log("Input: \n", input);
    console.log("Lexer: \n", Lexer.lex(input));
    console.log("Parser: \n", JSON.stringify(Parser.parse(Lexer.getScanner(Lexer.lex(input))), null, 4));
    console.log("Generator: \n", JSON.stringify(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input)))), null, 4));
    console.log("Emitter: \n", Generator.emit(Generator.generate(Parser.parse(Lexer.getScanner(Lexer.lex(input))))));
}

main();
