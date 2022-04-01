import { Scanner, TokenType, ToString } from "./lexer.js";

export interface Program {
    kind: "Program"
    functions: Function[];
}

export interface Identifier {
    kind: "Identifier";
    value: string;
}

function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

export interface Function {
    kind: "Function";
    name: Identifier;
    body: Statement;
}

export interface Constant {
    kind: "Constant";
    value: number;
}

export interface Return {
    kind: "Return";
    expr: Expression;
}

export type Expression = Constant;

export type Statement = Return;

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

function parseFunctionDeclaration(scanner: Scanner): Function {
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
        kind: "Function",
        name: Identifier(function_name.value),
        body
    }
}

export function parse(scanner: Scanner): Program {
    return {
        kind: "Program",
        functions: [parseFunctionDeclaration(scanner)]
    }
}
