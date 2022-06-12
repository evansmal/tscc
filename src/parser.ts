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

export type UnaryOperand = "Complement" | "Negate" | "LogicalNot" | "LogicalAnd";

export interface UnaryOperator {
    kind: "UnaryOperator";
    operand: UnaryOperand;
}

export function UnaryOperator(operand: UnaryOperand): UnaryOperator {
    return {
        kind: "UnaryOperator",
        operand
    };
}

export interface UnaryExpression {
    kind: "UnaryExpression";
    operator: UnaryOperator;
    expression: Expression;
}

function UnaryExpression(operator: UnaryOperator, expression: Expression): UnaryExpression {
    return {
        kind: "UnaryExpression",
        operator,
        expression
    };
}

export interface Return {
    kind: "Return";
    expr: Expression;
}

export type BinaryOperand = "Add" | "Subtract" | "Multiply" | "Divide" | "Mod";

export interface BinaryOperator {
    kind: "BinaryOperator";
    operand: BinaryOperand;
}

export function BinaryOperator(operand: BinaryOperand): BinaryOperator {
    return { kind: "BinaryOperator", operand };
}

export interface BinaryExpression {
    kind: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}

export function BinaryExpression(operator: BinaryOperator, left: Expression, right: Expression): BinaryExpression {
    return { kind: "BinaryExpression", operator, left, right };
}

export type Expression = Constant | UnaryExpression | BinaryExpression;

export type Statement = Return;

function expect(token_type: TokenType, scanner: Scanner) {
    const token = scanner.next();
    if (token.kind !== token_type) throw new Error(`Expected '${token_type}' but got '${token.kind}'`);
    return token;
}

function parseExpression(scanner: Scanner): Expression {
    const token = scanner.next();
    if (token.kind === "int") {
        return {
            kind: "Constant",
            value: parseInt(token.value)
        };
    } else if (token.kind === "bitwise_complement") {
        return UnaryExpression(
            UnaryOperator("Complement"),
            parseExpression(scanner)
        );
    } else if (token.kind === "negation") {
        return UnaryExpression(
            UnaryOperator("Negate"),
            parseExpression(scanner)
        );
    } else if (token.kind === "oparen") {
        const expr = parseExpression(scanner);
        expect("cparen", scanner);
        return expr;
    } else if (token.kind === "logical_not") {
        return UnaryExpression(
            UnaryOperator("LogicalNot"),
            parseExpression(scanner)
        );
    } else if (token.kind === "logical_and") {
        return UnaryExpression(
            UnaryOperator("LogicalAnd"),
            parseExpression(scanner)
        );
    }
    else {
        throw new Error(`Could not parse expression '${token.kind}'`);
    }
}

function parseStatement(scanner: Scanner): Statement {
    expect("return", scanner);
    const expression = parseExpression(scanner);
    const statement: Return = {
        kind: "Return",
        expr: expression
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

export function toString(program: Program): string {
    return JSON.stringify(program, null, 4);
}

export function parse(scanner: Scanner): Program {
    return {
        kind: "Program",
        functions: [parseFunctionDeclaration(scanner)]
    }
}
