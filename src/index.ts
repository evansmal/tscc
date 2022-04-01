
import { readFileSync } from "fs";
import { argv } from 'process';

import { lex, getScanner, Scanner, Token, ToString } from "./lexer.js";

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
    body: Block;
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

type Block = Statement[];

function parseStatement(scanner: Scanner): Statement {
    const token = scanner.next();
    if (token.kind === "return") {
        const constant = scanner.next();
        return {
            kind: "Return",
            expr: {
                kind: "Constant",
                value: parseInt(constant.value)
            }
        }

    } else {
        throw new Error("Could not parse statement");
    }
}

function parseFunctionDeclaration(scanner: Scanner): FunctionDeclaration {
    const return_identifier = scanner.next();
    if (return_identifier.kind !== "identifier") {
        throw new Error("Could not parse function return type identifier: " + ToString(return_identifier));
    }
    const function_name = scanner.next();

    scanner.next(); // (
    scanner.next(); // )

    scanner.next(); // {
    const body = parseStatement(scanner)
    scanner.next(); // }

    return {
        kind: "FunctionDeclaration",
        name: Identifier(function_name.value),
        body: [body]
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
