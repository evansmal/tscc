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

function lowerStatement(statement: Parser.Statement): Instruction[] {
    const instructions: Instruction[] = [];
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
