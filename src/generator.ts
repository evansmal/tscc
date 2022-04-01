import * as Parser from "./parser.js";

interface Identifier {
    kind: "Identifier";
    value: string;
}

function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

interface Program {
    kind: "Program";
    function_defintion: Function;
}

interface Function {
    kind: "Function";
    name: Identifier;
    instructions: Instruction[];
}

interface Imm {
    kind: "Imm";
    value: number;
}

interface Register {
    kind: "Register";
    identifier: Identifier;
}

type Operand = Imm | Register;

interface Mov {
    kind: "Mov"
    src: Operand;
    dst: Operand;
}

interface Ret {
    kind: "Ret"

}

type Instruction = Mov | Ret;

function lowerExpression(expression: Parser.Expression): Operand {
    if (expression.kind === "Constant") {
        return {
            kind: "Imm",
            value: expression.value
        };
    } else {
        throw new Error(`Could not lower expression type '${expression.kind}'`);
    }

}

function lowerStatement(statement: Parser.Statement): Instruction[] {

    if (statement.kind === "Return") {
        return [
            { kind: "Mov", src: lowerExpression(statement.expr), dst: { kind: "Register", identifier: Identifier("eax") } },
            { kind: "Ret" }
        ];
    } else {
        throw new Error(`Could not lower statement type '${statement.kind}'`);
    }
}

function lowerFunction(func: Parser.Function): Function {
    return {
        kind: "Function",
        name: func.name,
        instructions: lowerStatement(func.body)
    };
}

export function generate(program: Parser.Program): Program {
    return {
        kind: "Program",
        function_defintion: lowerFunction(program.functions[0])
    }

}

function emitOperand(operand: Operand): string {
    if (operand.kind === "Imm") return `$${operand.value}`;
    else if (operand.kind === "Register") return `%${operand.identifier.value}`;
    else throw new Error(`Could emit operand: ${operand}`);
}

function emitInstruction(instruction: Instruction): string {
    if (instruction.kind === "Mov") return `movl ${emitOperand(instruction.src)}, ${emitOperand(instruction.dst)}`;
    else if (instruction.kind === "Ret") return `ret`;
    else throw new Error(`Could emit instruction: ${instruction}`);
}

function emitFunction(func: Function): string {
    return `\t.globl ${func.name.value}
${func.name.value}:
\t${func.instructions.map(emitInstruction).join("\n\t")}
    `;
}

export function emit(program: Program): string {
    return emitFunction(program.function_defintion);
}

