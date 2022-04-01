
import { readFileSync } from "fs";
import { argv } from 'process';

import { lex } from "./lexer.js";

function main() {
    const input = readFileSync(argv[2]).toString().trim()
    console.log(input);
    console.log(lex(input));
}

main();
