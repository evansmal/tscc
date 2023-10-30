import * as Parser from "./parser.js";
import { Result, Ok, Err } from "./common.js";

import { inspect } from "node:util";

export type SemaError<T> = Result<T, string>;

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

export interface FunctionCall {
    kind: "FunctionCall";
    name: Identifier;
    args: Value[];
    dst: Value;
}

export function FunctionCall(
    name: Identifier,
    args: Value[],
    dst: Value
): FunctionCall {
    return { kind: "FunctionCall", name, args, dst };
}

export type Instruction =
    | Return
    | UnaryInstruction
    | BinaryInstruction
    | Copy
    | Jump
    | JumpIfZero
    | JumpIfNotZero
    | Label
    | FunctionCall;

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
    createVariable: (name?: Parser.Identifier) => Variable;
    getVariable: (name: Parser.Identifier) => SemaError<Variable>;
    getVariables: () => Map<string, Variable>;
    createLabel: (name: string) => Label;
    getCurrentLabelId: () => number;
}

let GLOBAL_VARIABLE_ID = 0;
let GLOBAL_LABEL_ID = 0;

function createScope(outer?: Scope): Scope {
    // Keep the original identifier name to help with debugging
    const generateName = (name: string) => `${name}${GLOBAL_VARIABLE_ID++}`;

    // Store a mapping from identifier (what the programmer writes) to a
    // variable in the IR. We create unique variable names by using a global
    // counter since we need to emulate the variable scoping here
    const variables = new Map<string, Variable>();

    function createVariable(name?: Parser.Identifier) {
        // Check if a variable already exists in the local scope since we
        // cannot reclare a local variable
        if (name && variables.has(name.value)) {
            throw new Error(`Cannot redeclare a variable named: ${name.value}`);
        }
        const generated_name = generateName(name ? name.value : `tmp`);
        const variable = Variable(Identifier(generated_name));

        // If this is a named variable and not a temporary we should store it
        // in the variable map
        if (name) variables.set(name.value, variable);

        return variable;
    }

    function getVariable(name: Identifier) {
        // Attempt to find the variable locally (in the same scope)
        const variable = variables.get(name.value);
        if (variable) return Ok(variable);

        // If we don't find it locally, we should recurse upwards to find it
        if (outer) return outer.getVariable(name);
        return Err(`Cannot find variable name ${name}`);
    }

    function getVariables() {
        return variables;
    }

    function createLabel(name: string) {
        const fully_qualified_name = `${name}_${GLOBAL_LABEL_ID++}`;
        return Label(Identifier(fully_qualified_name));
    }

    function getCurrentLabelId() {
        return GLOBAL_LABEL_ID;
    }

    return {
        createVariable,
        getVariable,
        getVariables,
        createLabel,
        getCurrentLabelId
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

function lowerFunctionCall(call: Parser.FunctionCall) {}

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
        if (scope.getVariable(expression.identifier).isErr()) {
            throw new Error(
                `Variable '${expression.identifier.value}' does not exist`
            );
        }
        return scope.getVariable(expression.identifier).unwrap();
    } else if (expression.kind === "VariableAssignment") {
        const variable = scope.getVariable(expression.dst.identifier);
        if (variable.isErr()) throw new Error(variable.unwrapErr());
        instructions.push(
            ...[
                Copy(
                    lowerExpression(expression.src, instructions, scope),
                    variable.unwrap()
                )
            ]
        );
        return variable.unwrap();
    } else if (expression.kind === "TernaryExpression") {
        const result = scope.createVariable();
        const true_label = scope.createLabel("is_true");
        const false_label = scope.createLabel("is_false");
        const condition = lowerExpression(
            expression.condition,
            instructions,
            scope
        );
        instructions.push(JumpIfZero(condition, false_label.identifier));
        const truthy_value = lowerExpression(
            expression.is_true,
            instructions,
            scope
        );
        instructions.push(
            Copy(truthy_value, result),
            Jump(true_label.identifier),
            false_label
        );
        const false_value = lowerExpression(
            expression.is_false,
            instructions,
            scope
        );
        instructions.push(Copy(false_value, result), true_label);
        return result;
    } else if (expression.kind === "FunctionCall") {
        const args: Value[] = [];
        const result = scope.createVariable();
        for (const arg of expression.args) {
            args.push(lowerExpression(arg, instructions, scope));
        }
        instructions.push(FunctionCall(expression.name, args, result));
        return result;
    } else {
        throw new Error(
            `Could not lower AST expression into IR instruction: ${inspect(
                expression,
                { depth: 0, colors: true }
            )}`
        );
    }
}

export function lowerCompoundStatement(
    statement: Parser.CompoundStatement,
    scope: Scope
): Instruction[] {
    const new_scope = createScope(scope);
    return statement.body.flatMap((statement) =>
        lowerStatement(statement, new_scope)
    );
}

function lowerStatement(
    statement: Parser.Statement,
    scope: Scope
): Instruction[] {
    const instructions: Instruction[] = [];
    if (statement.kind === "Return") {
        const variable = lowerExpression(statement.expr, instructions, scope);
        instructions.push({ kind: "Return", value: variable });
    } else if (statement.kind === "VariableDeclaration") {
        const variable = scope.createVariable(statement.identifier);
        if (statement.value) {
            instructions.push(
                ...[
                    Copy(
                        lowerExpression(statement.value, instructions, scope),
                        variable
                    )
                ]
            );
        }
    } else if (statement.kind === "IfStatement") {
        const cond = lowerExpression(statement.condition, instructions, scope);
        const true_label = scope.createLabel("is_true");
        const false_label = scope.createLabel("is_false");
        instructions.push(
            JumpIfZero(cond, false_label.identifier),
            ...lowerCompoundStatement(statement.body, scope),
            Jump(true_label.identifier),
            false_label
        );
        if (statement.else_body) {
            instructions.push(
                ...lowerCompoundStatement(statement.else_body, scope)
            );
        }
        instructions.push(true_label);
    } else if (statement.kind === "CompoundStatement") {
        instructions.push(...lowerCompoundStatement(statement, scope));
    } else if (statement.kind === "ExpressionStatement") {
        lowerExpression(statement.expression, instructions, scope);
    } else if (statement.kind === "ForStatement") {
        const begin_label = scope.createLabel("for_begin");
        const end_label = scope.createLabel("for_end");

        // TODO: Check these are expression statements properly
        const initial = lowerExpression(
            <Parser.Expression>statement.initial,
            instructions,
            scope
        );

        instructions.push(begin_label);
        const condition = lowerExpression(
            <Parser.Expression>statement.condition,
            instructions,
            scope
        );
        instructions.push(JumpIfZero(condition, end_label.identifier));
        instructions.push(end_label);
    } else {
        throw new Error(
            `Could not lower AST statement into IR instruction: ${inspect(
                statement,
                { depth: null, colors: true }
            )}`
        );
    }
    return instructions;
}

function lowerFunctionDefinition(func: Parser.FunctionDefinition): Function {
    const scope = createScope();
    func.parameters.forEach((p) => {
        scope.createVariable(p.name);
    });
    return {
        kind: "Function",
        name: func.name,
        body: func.body.body.flatMap((statement) =>
            lowerStatement(statement, scope)
        )
    };
}

export function toString(program: Program): string {
    return inspect(program, { depth: null });
}

export function lower(program: Parser.Program): Program {
    const functions: Function[] = [];
    for (const declaration of program.declarations) {
        if (declaration.kind === "FunctionDefinition") {
            functions.push(lowerFunctionDefinition(declaration));
        }
    }
    return Program(functions);
}
