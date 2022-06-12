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

function Imm(value: number): Imm {
    return { kind: "Imm", value };
}

type RegisterName = "ax" | "r10" | "r11";

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

interface Compare {
    kind: "Compare";
    src: Operand;
    dst: Operand;

}

function Compare(src: Operand, dst: Operand): Compare {
    return { kind: "Compare", src, dst }
}

type ConditionCode = "E" | "NE" | "L" | "LE" | "G" | "GE";

interface SetConditionCode {
    kind: "SetConditionCode";
    code: ConditionCode;
    operand: Operand;
}

function SetConditionCode(code: ConditionCode, operand: Operand): SetConditionCode {
    return { kind: "SetConditionCode", code, operand };
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
    size: number;
}

function AllocateStack(size: number): AllocateStack {
    return { kind: "AllocateStack", size };
}

type Instruction = Mov | Compare | SetConditionCode | UnaryInstruction | AllocateStack | Ret;

function lowerUnaryOperator(operator: IR.UnaryOperator): UnaryOperator {
    if (operator === "Complement") return { kind: "UnaryOperator", operator_type: "not" };
    else if (operator === "Negate") return { kind: "UnaryOperator", operator_type: "negate" };
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
        if (instruction.operator === "LogicalNot") {
            const dst = lowerValue(instruction.dst);
            return [
                Compare(Imm(0), lowerValue(instruction.src)),
                Mov(Imm(0), dst),
                SetConditionCode("E", dst)
            ];
        } else if (instruction.operator === "Negate" || instruction.operator === "Complement") {
            return [
                Mov(lowerValue(instruction.src), lowerValue(instruction.dst)),
                UnaryInstruction(lowerUnaryOperator(instruction.operator), lowerValue(instruction.dst))
            ];
        } else {
            throw new Error(`Could not lower IR.UnaryInstruction type '${instruction}'`);
        }
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

function replacePseudoRegister(program: Program): number {
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
        } else if (inst.kind === "Compare") {
            const src = (inst.src.kind === "PseudoRegister" ? putOnStack(inst.src) : inst.src);
            const dst = (inst.dst.kind === "PseudoRegister" ? putOnStack(inst.dst) : inst.dst);
            return Compare(src, dst);
        } else if (inst.kind === "SetConditionCode") {
            const operand = (inst.operand.kind === "PseudoRegister" ? putOnStack(inst.operand) : inst.operand);
            return SetConditionCode(inst.code, operand);
        }
        else if (inst.kind === "Ret" || inst.kind === "AllocateStack") return inst;
        else throw new Error(`Unexpected instruction encountered when trying to replaced pseudoregisters`);
    });
    return total_offset;
}

function insertStackAllocation(func: Function, total_offset: number) {
    func.instructions = [AllocateStack(total_offset), ...func.instructions];
}

function fixInvalidMovInstructions(func: Function) {
    func.instructions = func.instructions.flatMap(inst => {
        if (inst.kind === "Mov" && inst.src.kind === "Stack" && inst.dst.kind === "Stack") {
            const first = Mov(inst.src, Register("r10"));
            const second = Mov(Register("r10"), inst.dst);
            return [first, second];
        } else { return inst; }
    });
}

function fixInvalidCompareInstructions(func: Function) {
    func.instructions = func.instructions.flatMap(inst => {
        if (inst.kind === "Compare" && inst.src.kind === "Stack" && inst.dst.kind === "Stack") {
            const first = Mov(inst.src, Register("r10"));
            const second = Compare(Register("r10"), inst.dst);
            return [first, second];
        } else if (inst.kind === "Compare" && inst.dst.kind === "Imm") {
            const first = Mov(inst.dst, Register("r11"));
            const second = Compare(inst.src, Register("r11"))
            return [first, second];
        }
        else { return inst; }
    });

}

export function generate(ir: IR.Program): Program {
    const program: Program = {
        kind: "Program",
        function_defintion: lowerFunction(ir.functions[0])
    }
    const total_offset = replacePseudoRegister(program);
    insertStackAllocation(program.function_defintion, total_offset);
    fixInvalidMovInstructions(program.function_defintion);
    fixInvalidCompareInstructions(program.function_defintion);
    return program;
}

export function toString(program: Program): string {
    return JSON.stringify(program, null, 4);
}

function emitRegister(register: Register): string {
    if (register.name === "r10") return `%r10d`;
    else if (register.name === "ax") return `%eax`;
    else if (register.name === "r11") return `%r11d`;
    else throw new Error(`Cannot emit register ${JSON.stringify(register)}`);
}

function emitOperand(operand: Operand): string {
    if (operand.kind === "Imm") return `$${operand.value}`;
    else if (operand.kind === "Register") return emitRegister(operand);
    else if (operand.kind === "Stack") return `${operand.address}(%rbp)`;
    else throw new Error(`Could emit operand: ${JSON.stringify(operand)}`);
}

function emitRet(_: Ret): string {
    let res = `movq %rbp, %rsp\n`;
    res += `\tpopq %rbp\n`;
    res += `\tret`;
    return res;
}

function emitCompare(instruction: Compare): string {
    return `cmpl ${emitOperand(instruction.src)}, ${emitOperand(instruction.dst)}`;
}

function emitSetConditionCode(instruction: SetConditionCode): string {
    return `set${instruction.code} ${emitOperand(instruction.operand)}`;
}

function emitUnaryOperator(operator: UnaryOperator): string {
    if (operator.operator_type === "not") return `notl`;
    else if (operator.operator_type === "negate") return `negl`;
    else throw new Error(`Cannot emit unary operator: ${operator}`);
}

function emitUnaryInstruction(unary: UnaryInstruction): string {
    return `${emitUnaryOperator(unary.operator)} ${emitOperand(unary.operand)}`;
}

function emitAllocateStack(alloc: AllocateStack): string {
    return `subq $${alloc.size}, %rsp`;
}

function emitInstruction(instruction: Instruction): string {
    if (instruction.kind === "Mov") return `movl ${emitOperand(instruction.src)}, ${emitOperand(instruction.dst)}`;
    else if (instruction.kind === "Ret") return emitRet(instruction);
    else if (instruction.kind === "Compare") return emitCompare(instruction);
    else if (instruction.kind === "SetConditionCode") return emitSetConditionCode(instruction);
    else if (instruction.kind === "AllocateStack") return emitAllocateStack(instruction);
    else if (instruction.kind === "UnaryInstruction") return emitUnaryInstruction(instruction);
    else throw new Error(`Could emit instruction: ${instruction}`);
}

function emitFunction(func: Function): string {
    return `\t.globl ${func.name.value}
${func.name.value}:
\tpushq %rbp
\tmovq %rsp, %rbp
\t${func.instructions.map(emitInstruction).join("\n\t")}`;
}

export function emit(program: Program): string {
    return emitFunction(program.function_defintion);
}

