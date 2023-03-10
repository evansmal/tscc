import { Scanner, Token, TokenType } from "./lexer.js";
import { Result, Ok, Err } from "./common.js";

import { inspect } from "node:util";

interface ParseError {
    message: string;
    position: number;
    toString: () => string;
}

function ParseError(message: string, position: number = 0): ParseError {
    const toString = () => {
        return `Parsing failed at (${position}): ${message}`;
    };
    return { message, position, toString };
}

export type ParseResult<T> = Result<T, ParseError>;

export interface Program {
    kind: "Program";
    functions: Function[];
}

export function Program(functions: Function[]): Program {
    return { kind: "Program", functions };
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
    body: Statement[];
}

export function Function(name: Identifier, body: Statement[]): Function {
    return { kind: "Function", name, body };
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

export interface VariableReference {
    kind: "VariableReference";
    identifier: Identifier;
}

function VariableReference(identifier: Identifier): VariableReference {
    return { kind: "VariableReference", identifier };
}

interface VariableAssignment {
    kind: "VariableAssignment";
    src: Expression;
    dst: VariableReference;
}

function VariableAssignment(
    src: Expression,
    dst: VariableReference
): VariableAssignment {
    return { kind: "VariableAssignment", src, dst };
}

export type Expression =
    | Constant
    | UnaryExpression
    | BinaryExpression
    | VariableReference
    | VariableAssignment;

export interface VariableDeclaration {
    kind: "VariableDeclaration";
    type: Identifier;
    identifier: Identifier;
    value: Expression | undefined;
}

function VariableDeclaration(
    type: Identifier,
    identifier: Identifier,
    value?: Expression
): VariableDeclaration {
    return { kind: "VariableDeclaration", type, identifier, value: value };
}

export interface IfStatement {
    kind: "IfStatement";
    condition: Expression;
    body: Statement[];
}

function IfStatement(condition: Expression, body: Statement[]): IfStatement {
    return { kind: "IfStatement", condition, body };
}

export type Statement = Return | VariableDeclaration | Expression | IfStatement;

function expect(token_type: TokenType, scanner: Scanner): ParseResult<Token> {
    const token = scanner.next();
    if (token.kind !== token_type) {
        return Err(
            ParseError(
                `Expected '${token_type}' but got '${token.value}' which is of type '${token.kind}'`,
                token.position
            )
        );
    }
    return Ok(token);
}

// TODO: refactor unary ops using peek()
function parseFactor(scanner: Scanner): Expression {
    const token = scanner.next();
    if (token.kind === "identifier") {
        return VariableReference(Identifier(token.value));
    } else if (token.kind === "int") {
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

export function parseExpression(
    scanner: Scanner,
    minimum_precedence: number = 0
): Expression {
    // Handle assignments otherwise we should precedence climb
    let left = parseFactor(scanner);
    let token = scanner.peek();
    if (token.kind === "assignment") {
        // Parse: <id> = <expr>
        if (left.kind !== "VariableReference") throw new Error("UNEXP");
        expect("assignment", scanner);
        return VariableAssignment(parseExpression(scanner), left);
    }
    while (
        isTokenKindBinaryOperator(token.kind) &&
        getTokenPrecedence(token) >= minimum_precedence
    ) {
        const operator = parseBinaryOperator(scanner);
        const right = parseExpression(scanner, getTokenPrecedence(token) + 1);
        left = BinaryExpression(operator, left, right);
        token = scanner.peek();
    }
    return left;
}

export function parseStatement(scanner: Scanner): Statement {
    const next = scanner.peek();
    if (next.kind === "return") {
        // Parse: return <expr> ;
        expect("return", scanner);
        const expression = parseExpression(scanner);
        const statement = Return(expression);
        expect("semicolon", scanner);
        return statement;
    } else if (next.kind === "identifier" && next.value === "int") {
        // Parse: int <id> [ = <expr>] ;
        expect("identifier", scanner);
        const variable_name = scanner.next();
        if (scanner.peek().kind === "assignment") {
            expect("assignment", scanner);
            const statement = VariableDeclaration(
                Identifier("int"),
                Identifier(variable_name.value),
                parseExpression(scanner)
            );
            expect("semicolon", scanner);
            return statement;
        } else {
            expect("semicolon", scanner);
            return VariableDeclaration(
                Identifier("int"),
                Identifier(variable_name.value)
            );
        }
    } else if (next.kind === "if") {
        // Parse: <expr> ;
        expect("if", scanner);
        expect("oparen", scanner);
        const expression = parseExpression(scanner, 0);
        expect("cparen", scanner);
        expect("obracket", scanner);
        const body = parseBasicBlock(scanner);
        expect("cbracket", scanner);
        if (body.isErr()) throw new Error(body.unwrapErr().toString());
        return IfStatement(expression, body.unwrap());
    } else if (next.kind === "identifier" || next.kind === "int") {
        // Parse: <expr> ;
        const expression = parseExpression(scanner);
        expect("semicolon", scanner);
        return expression;
    } else {
        throw new Error(`Unable to parse statement: ${JSON.stringify(next)}`);
    }
}

function parseBasicBlock(scanner: Scanner): ParseResult<Statement[]> {
    const statements: Statement[] = [];
    while (scanner.peek().kind !== "cbrace") {
        statements.push(parseStatement(scanner));
    }
    return Ok(statements);
}

function parseFunctionDeclaration(scanner: Scanner): ParseResult<Function> {
    const return_identifier = scanner.next();
    if (return_identifier.kind !== "identifier") {
        return Err(
            ParseError(
                `Expected function return type but got '${return_identifier.value}'`,
                return_identifier.position
            )
        );
    }
    const function_name = expect("identifier", scanner);
    if (function_name.isErr()) return function_name;

    const body = expect("oparen", scanner)
        .andThen((_) => expect("cparen", scanner))
        .andThen((_) => expect("obrace", scanner))
        .andThen((_) => parseBasicBlock(scanner));

    if (body.isErr()) return body;

    const fn = Function(
        Identifier(function_name.unwrap().value),
        body.unwrap()
    );
    return expect("cbrace", scanner).andThen((_) => Ok(fn));
}

export function toString(program: Program): string {
    return inspect(program, { depth: null, colors: true });
}

export function parse(scanner: Scanner): ParseResult<Program> {
    return parseFunctionDeclaration(scanner).map((f) => {
        return Program([f]);
    });
}
