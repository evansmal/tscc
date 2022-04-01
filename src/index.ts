
import { readFileSync } from "fs";
import { argv } from 'process';

import { lex, getScanner, Scanner, Token, ToString } from "./lexer.js";


interface Variable {
    kind: "Variable"
}

interface Constant {
    kind: "Constant"
}

interface VariableAssignment {
    kind: "VariableAssignment"
}

interface Return {
    kind: "Return"
}

interface FunctionBody {
    kind: "FunctionBody"
    body: Statement[];
}

interface BinaryOperator {
    kind: "BinaryOperator"
}

interface Program {
    kind: "Program"
    functions: FunctionDeclaration[];
}

interface Identifier {
    kind: "Identifier";
    value: string;
}

function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

interface Declaration {
    kind: "Declaration"
}

type Block = [Statement | Declaration][];

interface FunctionDeclaration {
    kind: "FunctionDeclaration"
    name: Identifier;
    body: Block;
}

interface Statement {
    kind: "Statement"
}

function parseFunctionBody(scanner: Scanner): Block {
    let token = scanner.next();
    if (token.kind !== "obrace") throw new Error("Could not parse function body");

    const body: Token[] = [];
    while (true) {
        token = scanner.next();
        if (token.kind === "cbrace") break;
        body.push(token);
    }

    // TODO: parse function body
    console.log("Body tokens: ", body);

    return [];
}

function parseFunction(scanner: Scanner): FunctionDeclaration {

    const return_indentifier = scanner.next();
    if (return_indentifier.kind !== "identifier") throw new Error("Could not parse function return type identifier: " + ToString(return_indentifier));

    const name = scanner.next();

    scanner.next(); // (
    // TODO: get function interface
    scanner.next(); // )

    const body = parseFunctionBody(scanner)

    return {
        kind: "FunctionDeclaration",
        name: Identifier(name.value),
        body
    }
}

function parse(scanner: Scanner): Program {
    return {
        kind: "Program",
        functions: [parseFunction(scanner)]
    }
}

function main() {
    const input = readFileSync(argv[2]).toString().trim()
    console.log("Input: ", input);
    console.log("Lexer: ", lex(input));
    console.log("Parser: ", JSON.stringify(parse(getScanner(lex(input))), null, 4));
}

main();
