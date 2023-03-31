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
    functions: FunctionDefinition[];
}

export function Program(functions: FunctionDefinition[]): Program {
    return { kind: "Program", functions };
}

export interface Identifier {
    kind: "Identifier";
    value: string;
}

export function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

export interface Parameter {
    kind: "Parameter";
    type: Identifier;
    name: Identifier;
}

export function Parameter(type: Identifier, name: Identifier): Parameter {
    return { kind: "Parameter", type, name };
}

export interface FunctionDeclaration {
    kind: "FunctionDeclaration";
    name: Identifier;
    parameters: Parameter[];
}

export function FunctionDeclaration(
    name: Identifier,
    parameters: Parameter[]
): FunctionDeclaration {
    return { kind: "FunctionDeclaration", name, parameters };
}

export interface FunctionDefinition {
    kind: "FunctionDefinition";
    name: Identifier;
    parameters: Parameter[];
    body: Statement[];
}

export function FunctionDefinition(
    name: Identifier,
    parameters: Parameter[],
    body: Statement[]
): FunctionDefinition {
    return { kind: "FunctionDefinition", name, parameters, body };
}

export interface Constant {
    kind: "Constant";
    value: number;
}

export function Constant(value: number): Constant {
    return {
        kind: "Constant",
        value
    };
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

export function VariableReference(identifier: Identifier): VariableReference {
    return { kind: "VariableReference", identifier };
}

export interface VariableAssignment {
    kind: "VariableAssignment";
    src: Expression;
    dst: VariableReference;
}

export function VariableAssignment(
    src: Expression,
    dst: VariableReference
): VariableAssignment {
    return { kind: "VariableAssignment", src, dst };
}

interface TernaryExpression {
    kind: "TernaryExpression";
    condition: Expression;
    is_true: Expression;
    is_false: Expression;
}

export function TernaryExpression(
    condition: Expression,
    is_true: Expression,
    is_false: Expression
): TernaryExpression {
    return { kind: "TernaryExpression", condition, is_true, is_false };
}

export type Expression =
    | Constant
    | UnaryExpression
    | BinaryExpression
    | VariableReference
    | VariableAssignment
    | TernaryExpression;

export interface VariableDeclaration {
    kind: "VariableDeclaration";
    type: Identifier;
    identifier: Identifier;
    value: Expression | undefined;
}

export function VariableDeclaration(
    type: Identifier,
    identifier: Identifier,
    value?: Expression
): VariableDeclaration {
    return { kind: "VariableDeclaration", type, identifier, value: value };
}

export interface IfStatement {
    kind: "IfStatement";
    condition: Expression;
    body: CompoundStatement;
    else_body?: CompoundStatement | undefined;
}

export function IfStatement(
    condition: Expression,
    body: CompoundStatement,
    else_body?: CompoundStatement
): IfStatement {
    return { kind: "IfStatement", condition, body, else_body };
}

export interface ForStatement {
    kind: "ForStatement";
    initial: Statement;
    condition: Statement;
    post: Expression | undefined;
    body: Statement;
}

export function ForStatement(
    initial: Statement,
    condition: Statement,
    post: Expression | undefined,
    body: Statement
): ForStatement {
    return { kind: "ForStatement", initial, condition, post, body };
}

export interface CompoundStatement {
    kind: "CompoundStatement";
    body: Statement[];
}

export function CompoundStatement(body: Statement[]): CompoundStatement {
    return { kind: "CompoundStatement", body };
}

interface NullStatement {
    kind: "NullStatement";
}

export function NullStatement(): NullStatement {
    return { kind: "NullStatement" };
}

export type Statement =
    | Return
    | VariableDeclaration
    | Expression
    | IfStatement
    | ForStatement
    | CompoundStatement
    | NullStatement;

export type Node =
    | Expression
    | Statement
    | Program
    | FunctionDeclaration
    | Identifier;

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

function expectOrFail(token_type: TokenType, scanner: Scanner): Token {
    const result = expect(token_type, scanner);
    if (result.isErr()) throw new Error(result.unwrapErr().message);
    else return result.unwrap();
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
        expectOrFail("cparen", scanner);
        return expr;
    } else {
        throw new Error(`Could not parse expression '${token.kind}'`);
    }
}

function parseBinaryOperator(scanner: Scanner): BinaryOperator {
    const token = scanner.next();
    switch (token.kind) {
        case "plus":
            return BinaryOperator("Add");
        case "negation":
            return BinaryOperator("Subtract");
        case "asterisk":
            return BinaryOperator("Multiply");
        case "forward_slash":
            return BinaryOperator("Divide");
        case "percent":
            return BinaryOperator("Mod");
        case "logical_or":
            return BinaryOperator("Or");
        case "logical_and":
            return BinaryOperator("And");
        case "equal_to":
            return BinaryOperator("Equal");
        case "not_equal_to":
            return BinaryOperator("NotEqual");
        case "less_than":
            return BinaryOperator("Less");
        case "less_than_or_equal":
            return BinaryOperator("LessOrEqual");
        case "greater_than":
            return BinaryOperator("Greater");
        case "greater_than_or_equal":
            return BinaryOperator("GreaterOrEqual");
        default:
            throw new Error(`Could not parse binary operator '${token.kind}'`);
    }
}

const TOKEN_PRECEDENCE = {
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
    logical_or: 5,
    question_mark: 3
} as const;

type BinaryOperandTokenType = keyof typeof TOKEN_PRECEDENCE;

function doesTokenKindHavePrecedence(
    token_type: TokenType
): token_type is BinaryOperandTokenType {
    return Object.hasOwn(TOKEN_PRECEDENCE, token_type);
}

function getTokenPrecedence(token: Token): number {
    if (doesTokenKindHavePrecedence(token.kind)) {
        return TOKEN_PRECEDENCE[token.kind];
    } else throw new Error(`Unknown precedence for token ${token}`);
}

export function parseConditionalExpression(
    scanner: Scanner,
    minimum_precedence: number = 0
): Expression {
    let left = parseFactor(scanner);
    let token = scanner.peek();
    // We now need to precedence climb to find the end of the expression
    // which could be followed by a conditional expression
    while (
        doesTokenKindHavePrecedence(token.kind) &&
        getTokenPrecedence(token) >= minimum_precedence
    ) {
        if (token.kind === "question_mark") {
            // If we see '?' we know we have a ternary expression
            expectOrFail("question_mark", scanner);
            const is_true = parseExpression(scanner);
            expectOrFail("colon", scanner);
            const is_false = parseConditionalExpression(scanner);
            left = TernaryExpression(left, is_true, is_false);
        } else {
            const operator = parseBinaryOperator(scanner);
            const right = parseExpression(
                scanner,
                getTokenPrecedence(token) + 1
            );
            left = BinaryExpression(operator, left, right);
        }
        token = scanner.peek();
    }
    return left;
}

export function parseExpression(
    scanner: Scanner,
    minimum_precedence: number = 0
): Expression {
    // <exp> ::= <id> "=" <exp> | <conditional-exp>
    const next = scanner.peekMany(2);
    if (next[0].kind === "identifier" && next[1].kind === "assignment") {
        const variable_name = expectOrFail("identifier", scanner);
        expectOrFail("assignment", scanner);
        const reference = VariableReference(Identifier(variable_name.value));
        return VariableAssignment(parseExpression(scanner), reference);
    } else {
        return parseConditionalExpression(scanner, minimum_precedence);
    }
}

function parseCompoundStatement(scanner: Scanner): CompoundStatement {
    expectOrFail("obrace", scanner);
    const statements: Statement[] = [];
    while (scanner.peek().kind !== "cbrace") {
        statements.push(parseStatement(scanner));
    }
    expectOrFail("cbrace", scanner);
    return CompoundStatement(statements);
}

export function parseReturn(scanner: Scanner): Return {
    // Parse: return <expr> ;
    expectOrFail("return", scanner);
    const expression = parseExpression(scanner);
    const statement = Return(expression);
    expectOrFail("semicolon", scanner);
    return statement;
}

export function parseVariableDeclaration(
    scanner: Scanner
): VariableDeclaration {
    // Parse: int <id> [ = <expr>] ;
    expectOrFail("identifier", scanner);
    const variable_name = scanner.next();
    if (scanner.peek().kind === "assignment") {
        expectOrFail("assignment", scanner);
        const statement = VariableDeclaration(
            Identifier("int"),
            Identifier(variable_name.value),
            parseExpression(scanner)
        );
        expectOrFail("semicolon", scanner);
        return statement;
    } else {
        expectOrFail("semicolon", scanner);
        return VariableDeclaration(
            Identifier("int"),
            Identifier(variable_name.value)
        );
    }
}

export function parseIfStatement(scanner: Scanner): IfStatement {
    // Parse: if(<expr>) { [statement] } ;
    expectOrFail("if", scanner);
    expectOrFail("oparen", scanner);
    const expression = parseExpression(scanner);
    expectOrFail("cparen", scanner);

    // To simplify AST we treat the body as Statement[]
    const statement = parseStatement(scanner);
    const body =
        statement.kind === "CompoundStatement"
            ? statement
            : CompoundStatement([statement]);

    // TODO: Improve how we handle 'if(1) int x;'
    if (
        body.kind === "CompoundStatement" &&
        body.body.length === 1 &&
        body.body[0].kind === "VariableDeclaration"
    ) {
        throw new Error("Expected expression");
    }

    if (scanner.peek().kind === "else") {
        expectOrFail("else", scanner);
        // To simplify AST we treat the else body as Statement[]
        const else_statement = parseStatement(scanner);
        const else_body =
            else_statement.kind === "CompoundStatement"
                ? else_statement
                : CompoundStatement([else_statement]);
        return IfStatement(expression, body, else_body);
    } else {
        return IfStatement(expression, body);
    }
}

export function parseForStatement(scanner: Scanner): ForStatement {
    expectOrFail("for", scanner);
    expectOrFail("oparen", scanner);
    const initial = parseStatement(scanner);
    const condition = parseStatement(scanner);
    const post =
        scanner.peek().kind === "cparen" ? undefined : parseExpression(scanner);
    expectOrFail("cparen", scanner);
    const body = parseStatement(scanner);
    return ForStatement(initial, condition, post, body);
}

export function parseExpressionStatement(scanner: Scanner): Expression {
    // Parse: <expr> ;
    const expression = parseExpression(scanner);
    expectOrFail("semicolon", scanner);
    return expression;
}

export function parseEmptyStatement(scanner: Scanner): NullStatement {
    expectOrFail("semicolon", scanner);
    return NullStatement();
}

export function parseStatement(scanner: Scanner): Statement {
    // TODO: Refactor to return ParseResult
    const next = scanner.peek();
    if (next.kind === "obrace") {
        return parseCompoundStatement(scanner);
    } else if (next.kind === "return") {
        return parseReturn(scanner);
    } else if (next.kind === "identifier" && next.value === "int") {
        return parseVariableDeclaration(scanner);
    } else if (next.kind === "if") {
        return parseIfStatement(scanner);
    } else if (next.kind === "for") {
        return parseForStatement(scanner);
    } else if (next.kind === "identifier" || next.kind === "int") {
        return parseExpressionStatement(scanner);
    } else if (next.kind === "semicolon") {
        return parseEmptyStatement(scanner);
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

function parseFunctionDeclaration(
    scanner: Scanner
): ParseResult<FunctionDefinition> {
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

    const fn = FunctionDefinition(
        Identifier(function_name.unwrap().value),
        [],
        body.unwrap()
    );
    return expect("cbrace", scanner).andThen((_) => Ok(fn));
}

export function toString(program: Program): string {
    return inspect(program, { depth: null, colors: true });
}

export function parse(scanner: Scanner): ParseResult<Program> {
    const program = parseFunctionDeclaration(scanner).map((f) => {
        return Program([f]);
    });
    expectOrFail("eof", scanner);
    return program;
}
