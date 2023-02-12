import { Scanner, Token, TokenType, ToString } from "./lexer.js";

export interface Program {
    kind: "Program";
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

export type UnaryOperand =
    | "Complement"
    | "Negate"
    | "LogicalNot"
    | "LogicalAnd";

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

function UnaryExpression(
    operator: UnaryOperator,
    expression: Expression
): UnaryExpression {
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

export function Return(expr: Expression): Return {
    return { kind: "Return", expr };
}

export type BinaryOperand =
    | "Add"
    | "Subtract"
    | "Multiply"
    | "Divide"
    | "Mod"
    | "And"
    | "Or"
    | "Equal"
    | "NotEqual"
    | "Less"
    | "LessOrEqual"
    | "Greater"
    | "GreaterOrEqual";

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

export function BinaryExpression(
    operator: BinaryOperator,
    left: Expression,
    right: Expression
): BinaryExpression {
    return { kind: "BinaryExpression", operator, left, right };
}

export type Expression = Constant | UnaryExpression | BinaryExpression;

export type Statement = Return;

function expect(token_type: TokenType, scanner: Scanner) {
    const token = scanner.next();
    if (token.kind !== token_type)
        throw new Error(`Expected '${token_type}' but got '${token.kind}'`);
    return token;
}

// TODO: refactor unary ops using peek()
function parseFactor(scanner: Scanner): Expression {
    const token = scanner.next();
    if (token.kind === "int") {
        return {
            kind: "Constant",
            value: parseInt(token.value)
        };
    } else if (token.kind === "bitwise_complement") {
        return UnaryExpression(
            UnaryOperator("Complement"),
            parseFactor(scanner)
        );
    } else if (token.kind === "negation") {
        return UnaryExpression(UnaryOperator("Negate"), parseFactor(scanner));
    } else if (token.kind === "logical_not") {
        return UnaryExpression(
            UnaryOperator("LogicalNot"),
            parseExpression(scanner, 0)
        );
    } else if (token.kind === "logical_and") {
        return UnaryExpression(
            UnaryOperator("LogicalAnd"),
            parseExpression(scanner, 0)
        );
    } else if (token.kind === "logical_or") {
        return UnaryExpression(
            UnaryOperator("LogicalAnd"),
            parseExpression(scanner, 0)
        );
    } else if (token.kind === "oparen") {
        const expr = parseExpression(scanner, 0);
        expect("cparen", scanner);
        return expr;
    } else {
        throw new Error(`Could not parse expression '${token.kind}'`);
    }
}

function parseBinaryOperator(scanner: Scanner): BinaryOperator {
    const token = scanner.next();
    if (token.kind === "plus") return BinaryOperator("Add");
    else if (token.kind === "negation") return BinaryOperator("Subtract");
    else if (token.kind === "asterisk") return BinaryOperator("Multiply");
    else if (token.kind === "forward_slash") return BinaryOperator("Divide");
    else if (token.kind === "percent") return BinaryOperator("Mod");
    else if (token.kind === "logical_or") return BinaryOperator("Or");
    else if (token.kind === "logical_and") return BinaryOperator("And");
    else if (token.kind === "equal_to") return BinaryOperator("Equal");
    else if (token.kind === "not_equal_to") return BinaryOperator("NotEqual");
    else if (token.kind === "less_than") return BinaryOperator("Less");
    else if (token.kind === "less_than_or_equal")
        return BinaryOperator("LessOrEqual");
    else if (token.kind === "greater_than") return BinaryOperator("Greater");
    else if (token.kind === "greater_than_or_equal")
        return BinaryOperator("GreaterOrEqual");
    else throw new Error(`Could not parse binary operator '${token.kind}'`);
}

const BINOP_PRECEDENCE = {
    plus: 45,
    negation: 45,
    asterisk: 50,
    percent: 50,
    forward_slash: 50,
    less_than: 35,
    less_than_or_equal: 35,
    greater_than: 35,
    greater_than_or_equal: 35,
    equal_to: 30,
    not_equal_to: 30,
    logical_and: 10,
    logical_or: 5
} as const;

type BinaryOperandTokenType = keyof typeof BINOP_PRECEDENCE;

function isTokenKindBinaryOperator(
    token_type: TokenType
): token_type is BinaryOperandTokenType {
    return Object.hasOwn(BINOP_PRECEDENCE, token_type);
}

function getTokenPrecedence(token: Token): number {
    if (isTokenKindBinaryOperator(token.kind)) {
        return BINOP_PRECEDENCE[token.kind];
    } else throw new Error(`Unknown precedence for token ${token}`);
}

function parseExpression(
    scanner: Scanner,
    minimum_precedence: number
): Expression {
    let left = parseFactor(scanner);
    let token = scanner.peek();
    while (
        isTokenKindBinaryOperator(token.kind) &&
        getTokenPrecedence(token) >= minimum_precedence
    ) {
        console.log("parsin binop");
        const operator = parseBinaryOperator(scanner);
        console.log("op", operator);
        const right = parseExpression(scanner, getTokenPrecedence(token) + 1);
        left = BinaryExpression(operator, left, right);
        token = scanner.peek();
    }
    return left;
}

function parseStatement(scanner: Scanner): Statement {
    expect("return", scanner);
    const expression = parseExpression(scanner, 0);
    const statement = Return(expression);
    expect("semicolon", scanner);
    return statement;
}

function parseFunctionDeclaration(scanner: Scanner): Function {
    const return_identifier = scanner.next();
    if (return_identifier.kind !== "identifier") {
        throw new Error(
            "Could not parse function return type identifier: " +
                ToString(return_identifier)
        );
    }
    const function_name = scanner.next();

    expect("oparen", scanner);
    expect("cparen", scanner);

    expect("obrace", scanner);
    const body = parseStatement(scanner);
    expect("cbrace", scanner);

    return {
        kind: "Function",
        name: Identifier(function_name.value),
        body
    };
}

function indent(block: string) {
    const lines = block.trim().split("\n");
    return lines
        .map((x) => `    ${x}`)
        .join("\n")
        .trim();
}

function exprToString(expression: Expression): string {
    let result = indent(`Expression:${expression.kind}\n`);
    if (expression.kind === "Constant")
        result += ` -> ${expression.value.toString()}`;
    else if (expression.kind === "BinaryExpression")
        result +=
            "\n" +
            [
                `op: ${expression.operator.operand}`,
                `left: ${exprToString(expression.left)}`,
                `right: ${exprToString(expression.right)}`
            ]
                .map(indent)
                .join("\n");
    else if (expression.kind === "UnaryExpression") {
        result +=
            "\n" +
            [
                `op: ${expression.operator.operand}`,
                `expr: ${indent(exprToString(expression.expression))}`
            ]
                .map(indent)
                .join("\n");
    } else throw Error("Cannot convert Expression to string");
    return result;
}

function statementToString(statement: Statement): string {
    return `Statement:${statement.kind}\n${indent(
        exprToString(statement.expr)
    )}`;
}

export function toString(program: Program): string {
    return program.functions
        .map(
            (f) =>
                `Function ${f.name.value}\n${indent(statementToString(f.body))}`
        )
        .map(indent)
        .join("\n");
}

export function parse(scanner: Scanner): Program {
    return {
        kind: "Program",
        functions: [parseFunctionDeclaration(scanner)]
    };
}
