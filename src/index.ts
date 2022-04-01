
import { readFileSync } from "fs";
import { argv } from 'process';

import { lex, getScanner, Scanner, Token, TokenType, ToString } from "./lexer.js";

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

interface FunctionDeclaration {
    kind: "FunctionDeclaration"
    name: Identifier;
    body: Statement;
}

interface Constant {
    kind: "Constant";
    value: number;
}

interface Return {
    kind: "Return";
    expr: Expression;
}

type Expression = Constant;

type Statement = Return;

function expect(token_type: TokenType, scanner: Scanner) {
    const token = scanner.next();
    if (token.kind !== token_type) throw new Error(`Expected '${token_type}' but got '${token.kind}'`);
    return token;
}

function parseStatement(scanner: Scanner): Statement {
    expect("return", scanner);
    const constant = expect("int", scanner);
    const statement: Return = {
        kind: "Return",
        expr: {
            kind: "Constant",
            value: parseInt(constant.value)
        }
    }
    expect("semicolon", scanner);
    return statement;
}

function parseFunctionDeclaration(scanner: Scanner): FunctionDeclaration {
    const return_identifier = scanner.next();
    if (return_identifier.kind !== "identifier") {
        throw new Error("Could not parse function return type identifier: " + ToString(return_identifier));
    }
    const function_name = scanner.next();

    expect("oparen", scanner);
    expect("cparen", scanner);

    expect("obrace", scanner);
    const body = parseStatement(scanner)
    expect("cbrace", scanner);

    return {
        kind: "FunctionDeclaration",
        name: Identifier(function_name.value),
        body
    }
}

function parse(scanner: Scanner): Program {
    return {
        kind: "Program",
        functions: [parseFunctionDeclaration(scanner)]
    }
}

function main() {
    const input = readFileSync(argv[2]).toString().trim()
    console.log("Input: ", input);
    console.log("Lexer: ", lex(input));
    console.log("Parser: ", JSON.stringify(parse(getScanner(lex(input))), null, 4));
}

main();
