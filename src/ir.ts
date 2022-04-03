import * as Parser from "./parser.js";

export interface Program {
    kind: "Program"
    functions: Function[];
}

interface Identifier {
    kind: "Identifier";
    value: string;
}

function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

interface Function {
    kind: "Function";
    name: Identifier;
    body: Instruction[];
}

interface Return {
    kind: "Return";
    value: Value;
}

interface Complement {
    kind: "Complement";
}

interface Negate {
    kind: "Negate";
}

type UnaryOperator = Complement | Negate;

interface UnaryInstruction {
    kind: "UnaryInstruction";
    operator: UnaryOperator;
    src: Value;
    dst: Value;
}

type Instruction = Return | UnaryInstruction;

interface ConstantInteger {
    kind: "ConstantInteger";
    value: number;
}

interface Variable {
    kind: "Variable";
    identifier: Identifier;
}

type Value = ConstantInteger | Variable;

function lowerUnaryOperator(operator: UnaryOperator): UnaryOperator {
    if (operator.kind === "Negate") return { kind: "Negate" };
    else if (operator.kind === "Complement") return { kind: "Complement" };
    else throw new Error("Could not lower unary operator to IR");
}

function lowerExpression(expression: Parser.Expression, instructions: Instruction[], createValue: () => Value): Value {
    if (expression.kind === "Constant") {
        return { kind: "ConstantInteger", value: expression.value };
    } else if (expression.kind === "UnaryExpression") {
        const dst = createValue();
        const unary: UnaryInstruction = {
            kind: "UnaryInstruction",
            operator: lowerUnaryOperator(expression.operator),
            src: lowerExpression(expression.expression, instructions, createValue),
            dst
        };
        instructions.push(unary);
        return dst;
    }
    else {
        throw new Error("Could not lower AST expression into IR instruction");
    }
}

function lowerStatement(statement: Parser.Statement): Instruction[] {
    const instructions: Instruction[] = [];
    const variables: Variable[] = [];
    const create_value: () => Value = () => {
        let id = 0;
        const variable: Variable = {
            kind: "Variable",
            identifier: Identifier(`tmp${id++}`)
        }
        variables.push(variable);
        return variable;
    };
    if (statement.kind === "Return") {
        const variable = lowerExpression(statement.expr, instructions, create_value);
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
