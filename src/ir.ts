import * as Parser from "./parser.js";

import { inspect } from "node:util";

export interface Program {
    kind: "Program";
    functions: Function[];
}

export interface Identifier {
    kind: "Identifier";
    value: string;
}

export function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

export interface Function {
    kind: "Function";
    name: Identifier;
    body: Instruction[];
}

export interface Return {
    kind: "Return";
    value: Value;
}

export type UnaryOperator =
    | "Complement"
    | "Negate"
    | "LogicalNot"
    | "LogicalAnd";

export interface UnaryInstruction {
    kind: "UnaryInstruction";
    operator: UnaryOperator;
    src: Value;
    dst: Value;
}

function UnaryInstruction(
    operator: UnaryOperator,
    src: Value,
    dst: Value
): UnaryInstruction {
    return { kind: "UnaryInstruction", operator, src, dst };
}

export type BinaryOperator =
    | "Add"
    | "Subtract"
    | "Multiply"
    | "Divide"
    | "Mod"
    | "Equal"
    | "NotEqual"
    | "Less"
    | "LessOrEqual"
    | "Greater"
    | "GreaterOrEqual";

export interface BinaryInstruction {
    kind: "BinaryInstruction";
    operator: BinaryOperator;
    first: Value;
    second: Value;
    dst: Value;
}

export function BinaryInstruction(
    operator: BinaryOperator,
    first: Value,
    second: Value,
    dst: Value
): BinaryInstruction {
    return { kind: "BinaryInstruction", operator, first, second, dst };
}

export interface Copy {
    kind: "Copy";
    src: Value;
    dst: Value;
}

function Copy(src: Value, dst: Value): Copy {
    return { kind: "Copy", src, dst };
}

export interface Jump {
    kind: "Jump";
    target: Identifier;
}

function Jump(target: Identifier): Jump {
    return { kind: "Jump", target };
}

export interface JumpIfZero {
    kind: "JumpIfZero";
    condition: Value;
    target: Identifier;
}

function JumpIfZero(condition: Value, target: Identifier): JumpIfZero {
    return { kind: "JumpIfZero", condition, target };
}

export interface JumpIfNotZero {
    kind: "JumpIfNotZero";
    condition: Value;
    target: Identifier;
}

function JumpIfNotZero(condition: Value, target: Identifier): JumpIfNotZero {
    return { kind: "JumpIfNotZero", condition, target };
}

export interface Label {
    kind: "Label";
    identifier: Identifier;
}

function Label(identifier: Identifier): Label {
    return { kind: "Label", identifier };
}

export type Instruction =
    | Return
    | UnaryInstruction
    | BinaryInstruction
    | Copy
    | Jump
    | JumpIfZero
    | JumpIfNotZero
    | Label;

export interface ConstantInteger {
    kind: "ConstantInteger";
    value: number;
}

export function ConstantInteger(value: number): Value {
    return { kind: "ConstantInteger", value };
}

export interface Variable {
    kind: "Variable";
    identifier: Identifier;
}

function Variable(identifier: Identifier): Variable {
    return { kind: "Variable", identifier };
}

export type Value = ConstantInteger | Variable;

function lowerUnaryOperator(operator: Parser.UnaryOperator): UnaryOperator {
    return operator.operand;
}

function lowerBinaryOperator(operator: Parser.BinaryOperator): BinaryOperator {
    if (operator.operand !== "And" && operator.operand !== "Or") {
        return operator.operand;
    }
    throw new Error("Cannot lower Parser.BinaryOperator.And/Or to IR");
}

interface Scope {
    createVariable: (name?: string) => Variable;
    createLabel: (name: string) => Label;
}

function createScope(): Scope {
    let variable_start_id = 0;
    const variables: Variable[] = [];
    const createVariable = (name?: string) => {
        const variable = Variable(
            Identifier(name ? name : `tmp${variable_start_id++}`)
        );
        variables.push(variable);
        return variable;
    };
    let label_start_id = 0;
    const createLabel: (name: string) => Label = (name) => {
        const fully_qualified_name = `${name}_${label_start_id++}`;
        return Label(Identifier(fully_qualified_name));
    };

    return {
        createVariable,
        createLabel
    };
}

function lowerBinaryExpression(
    expression: Parser.BinaryExpression,
    scope: Scope
): [Instruction[], Variable] {
    const instructions: Instruction[] = [];
    // Need to treat And/Or differently because they short circuit
    if (expression.operator.operand === "And") {
        const false_label = scope.createLabel("is_false");
        const v1 = lowerExpression(expression.left, instructions, scope);
        instructions.push(JumpIfZero(v1, false_label.identifier));

        const v2 = lowerExpression(expression.right, instructions, scope);
        instructions.push(JumpIfZero(v2, false_label.identifier));

        const result = scope.createVariable();
        const end_label = scope.createLabel("end");
        instructions.push(
            ...[
                Copy(ConstantInteger(1), result),
                Jump(end_label.identifier),
                false_label,
                Copy(ConstantInteger(0), result),
                end_label
            ]
        );
        return [instructions, result];
    } else if (expression.operator.operand === "Or") {
        const false_label = scope.createLabel("is_false");
        const v1 = lowerExpression(expression.left, instructions, scope);
        instructions.push(JumpIfNotZero(v1, false_label.identifier));

        const v2 = lowerExpression(expression.right, instructions, scope);
        instructions.push(JumpIfNotZero(v2, false_label.identifier));

        const result = scope.createVariable();
        const end_label = scope.createLabel("end");
        instructions.push(
            ...[
                Copy(ConstantInteger(0), result),
                Jump(end_label.identifier),
                false_label,
                Copy(ConstantInteger(1), result),
                end_label
            ]
        );
        return [instructions, result];
    } else {
        const dst = scope.createVariable();
        const binary = BinaryInstruction(
            lowerBinaryOperator(expression.operator),
            lowerExpression(expression.left, instructions, scope),
            lowerExpression(expression.right, instructions, scope),
            dst
        );
        instructions.push(binary);
        return [instructions, dst];
    }
}

function lowerExpression(
    expression: Parser.Expression,
    instructions: Instruction[],
    scope: Scope
): Value {
    if (expression.kind === "Constant") {
        return { kind: "ConstantInteger", value: expression.value };
    } else if (expression.kind === "UnaryExpression") {
        const dst = scope.createVariable();
        const unary = UnaryInstruction(
            lowerUnaryOperator(expression.operator),
            lowerExpression(expression.expression, instructions, scope),
            dst
        );
        instructions.push(unary);
        return dst;
    } else if (expression.kind === "BinaryExpression") {
        const [is, dst] = lowerBinaryExpression(expression, scope);
        instructions.push(...is);
        return dst;
    } else if (expression.kind === "VariableReference") {
        return Variable(expression.identifier);
    } else {
        throw new Error(
            `Could not lower AST expression into IR instruction: ${inspect(
                expression
            )}`
        );
    }
}

function lowerStatement(statement: Parser.Statement): Instruction[] {
    const instructions: Instruction[] = [];
    const scope = createScope();
    if (statement.kind === "Return") {
        const variable = lowerExpression(statement.expr, instructions, scope);
        instructions.push({ kind: "Return", value: variable });
    } else if (statement.kind === "VariableDeclaration") {
        const variable = scope.createVariable(statement.identifier.value);
        instructions.push(
            ...[
                Copy(
                    lowerExpression(statement.literal, instructions, scope),
                    variable
                )
            ]
        );
    } else if (
        statement.kind === "Constant" ||
        statement.kind === "UnaryExpression" ||
        statement.kind === "BinaryExpression" ||
        statement.kind === "VariableReference"
    ) {
        lowerExpression(statement, instructions, scope);
    } else {
        throw new Error(
            `Could not lower AST statement into IR instruction: ${inspect(
                statement
            )}`
        );
    }
    return instructions;
}

function lowerFunction(func: Parser.Function): Function {
    return {
        kind: "Function",
        name: func.name,
        body: func.body.flatMap(lowerStatement)
    };
}

export function toString(program: Program): string {
    return inspect(program, { depth: null });
}

export function lower(program: Parser.Program): Program {
    return {
        kind: "Program",
        functions: program.functions.map(lowerFunction)
    };
}
