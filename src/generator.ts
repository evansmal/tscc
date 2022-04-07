import * as Parser from "./parser.js";
import * as IR from "./ir.js";

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

type RegisterName = "ax" | "r10";

interface Register {
    kind: "Register";
    name: RegisterName;
}

function Register(name: RegisterName): Register {
    return {
        kind: "Register",
        name
    };
}

interface PseudoRegister {
    kind: "PseudoRegister";
    identifier: Identifier;
}

interface Stack {
    kind: "Stack";
    address: number;
}

function Stack(address: number): Stack {
    return { kind: "Stack", address };
}

type Operand = Imm | Register | PseudoRegister | Stack;

interface Mov {
    kind: "Mov";
    src: Operand;
    dst: Operand;
}

function Mov(src: Operand, dst: Operand): Mov {
    return { kind: "Mov", src, dst };
}

interface Ret {
    kind: "Ret";
}

function Ret(): Ret {
    return { kind: "Ret" };
}

interface UnaryOperator {
    kind: "UnaryOperator";
    operator_type: "negate" | "not";
}

interface UnaryInstruction {
    kind: "UnaryInstruction";
    operator: UnaryOperator;
    operand: Operand;
}

function UnaryInstruction(operator: UnaryOperator, operand: Operand): UnaryInstruction {
    return { kind: "UnaryInstruction", operator, operand };
}

interface AllocateStack {
    kind: "AllocateStack";
    locals: number;
}

type Instruction = Mov | UnaryInstruction | AllocateStack | Ret;

function lowerUnaryOperator(operator: IR.UnaryOperator): UnaryOperator {
    if (operator.kind === "Complement") return { kind: "UnaryOperator", operator_type: "not" };
    else if (operator.kind === "Negate") return { kind: "UnaryOperator", operator_type: "negate" };
    else throw new Error(`Could not lower IR.UnaryOperator type '${operator}'`);
}

function lowerValue(value: IR.Value): Operand {
    if (value.kind === "ConstantInteger") {
        return {
            kind: "Imm",
            value: value.value
        }
    } else if (value.kind === "Variable") {
        return {
            kind: "PseudoRegister",
            identifier: value.identifier
        };
    } else {
        throw new Error(`Could not lower IR.Value type '${value}'`);
    }
}

function lowerInstruction(instruction: IR.Instruction): Instruction[] {

    if (instruction.kind === "Return") {
        return [
            Mov(lowerValue(instruction.value), Register("ax")),
            Ret()
        ];
    }
    else if (instruction.kind === "UnaryInstruction") {
        return [
            Mov(lowerValue(instruction.src), lowerValue(instruction.dst)),
            UnaryInstruction(lowerUnaryOperator(instruction.operator), lowerValue(instruction.dst))
        ];
    }
    else {
        throw new Error(`Could not lower IR.Instruction type '${instruction}'`);
    }

}

function lowerFunction(func: IR.Function): Function {
    return {
        kind: "Function",
        name: func.name,
        instructions: func.body.flatMap(lowerInstruction)
    };
}

export function generate(program: IR.Program): Program {
    return {
        kind: "Program",
        function_defintion: lowerFunction(program.functions[0])
    }
}

export function replacePseudoRegister(program: Program): number {
    let total_offset = 0;
    const offsets = new Map<string, Stack>();
    const putOnStack = (reg: PseudoRegister) => {
        if (!offsets.has(reg.identifier.value)) {
            total_offset -= 4;
            offsets.set(reg.identifier.value, Stack(total_offset));
        }
        return offsets.get(reg.identifier.value) as Stack;
    }
    program.function_defintion.instructions = program.function_defintion.instructions.map(inst => {
        if (inst.kind === "UnaryInstruction") {
            return (inst.operand.kind === "PseudoRegister" ? UnaryInstruction(inst.operator, putOnStack(inst.operand)) : inst);
        } else if (inst.kind === "Mov") {
            return Mov(
                (inst.src.kind === "PseudoRegister" ? putOnStack(inst.src) : inst.src),
                (inst.dst.kind === "PseudoRegister" ? putOnStack(inst.dst) : inst.dst)
            );
        }
        else if (inst.kind === "Ret" || inst.kind === "AllocateStack") return inst;
        else throw new Error(`Unexpected instruction encountered when trying to replaced pseudoregisters`);
    });
    return total_offset;
}

export function toString(program: Program): string {
    return JSON.stringify(program, null, 4);
}

function emitOperand(operand: Operand): string {
    if (operand.kind === "Imm") return `$${operand.value}`;
    else if (operand.kind === "Register") return `%${operand.name}`;
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

