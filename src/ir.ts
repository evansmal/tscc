import * as Parser from "./parser.js";

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

export type BinaryOperator = "Add" | "Subtract" | "Multiply" | "Divide" | "Mod";

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

export type Instruction = Return | UnaryInstruction | BinaryInstruction;

export interface ConstantInteger {
    kind: "ConstantInteger";
    value: number;
}

export interface Variable {
    kind: "Variable";
    identifier: Identifier;
}

export type Value = ConstantInteger | Variable;

function lowerUnaryOperator(operator: Parser.UnaryOperator): UnaryOperator {
    return operator.operand;
}

function lowerBinaryOperator(operator: Parser.BinaryOperator): BinaryOperator {
    return operator.operand;
}

function lowerExpression(
    expression: Parser.Expression,
    instructions: Instruction[],
    createVariable: () => Variable
): Value {
    if (expression.kind === "Constant") {
        return { kind: "ConstantInteger", value: expression.value };
    } else if (expression.kind === "UnaryExpression") {
        const dst = createVariable();
        const unary = UnaryInstruction(
            lowerUnaryOperator(expression.operator),
            lowerExpression(
                expression.expression,
                instructions,
                createVariable
            ),
            dst
        );
        instructions.push(unary);
        return dst;
    } else if (expression.kind === "BinaryExpression") {
        const dst = createVariable();
        const binary = BinaryInstruction(
            lowerBinaryOperator(expression.operator),
            lowerExpression(expression.left, instructions, createVariable),
            lowerExpression(expression.right, instructions, createVariable),
            dst
        );
        instructions.push(binary);
        return dst;
    } else {
        throw new Error(`Could not lower AST expression into IR instruction`);
    }
}

function lowerStatement(statement: Parser.Statement): Instruction[] {
    const instructions: Instruction[] = [];
    const variables: Variable[] = [];
    let variable_start_id = 0;
    const create_value: () => Variable = () => {
        const variable: Variable = {
            kind: "Variable",
            identifier: Identifier(`tmp${variable_start_id++}`)
        };
        variables.push(variable);
        return variable;
    };
    if (statement.kind === "Return") {
        const variable = lowerExpression(
            statement.expr,
            instructions,
            create_value
        );
        instructions.push({ kind: "Return", value: variable });
    } else {
        throw new Error("Could not lower AST statement into IR instruction");
    }
    return instructions;
}

function lowerFunction(func: Parser.Function): Function {
    return {
        kind: "Function",
        name: func.name,
        body: lowerStatement(func.body)
    };
}

export function toString(program: Program): string {
    return JSON.stringify(program, null, 4);
}

export function lower(program: Parser.Program): Program {
    return {
        kind: "Program",
        functions: program.functions.map(lowerFunction)
    };
}
