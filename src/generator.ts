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
    operator_type: "Negate" | "Not";
}

interface UnaryInstruction {
    kind: "UnaryInstruction";
    operator: UnaryOperator;
    operand: Operand;
}

function UnaryInstruction(operator: UnaryOperator, operand: Operand): UnaryInstruction {
    return { kind: "UnaryInstruction", operator, operand };
}

type BinaryOperand = "Add" | "Subtract" | "Multiply";

interface BinaryOperator {
    kind: "BinaryOperator";
    operand: BinaryOperand;
}

function BinaryOperator(operand: BinaryOperand): BinaryOperator {
    return { kind: "BinaryOperator", operand };
}

export interface BinaryInstruction {
    kind: "BinaryInstruction";
    operator: BinaryOperator;
    src: Operand;
    dst: Operand;
}

export function BinaryInstruction(operator: BinaryOperator, src: Operand, dst: Operand): BinaryInstruction {
    return { kind: "BinaryInstruction", operator, src, dst };
}

interface AllocateStack {
    kind: "AllocateStack";
    size: number;
}

function AllocateStack(size: number): AllocateStack {
    return { kind: "AllocateStack", size };
}

type Instruction = Mov | Compare | SetConditionCode | UnaryInstruction | BinaryInstruction | AllocateStack | Ret;

function lowerUnaryOperator(operator: IR.UnaryOperator): UnaryOperator {
    if (operator === "Complement") return { kind: "UnaryOperator", operator_type: "Not" };
    else if (operator === "Negate") return { kind: "UnaryOperator", operator_type: "Negate" };
    else throw new Error(`Could not lower IR.UnaryOperator type '${operator}'`);
}

function lowerBinaryOperator(operator: IR.BinaryOperator): BinaryOperator {
    if (operator === "Add") return BinaryOperator("Add");
    else if (operator === "Subtract") return BinaryOperator("Subtract");
    else if (operator === "Multiply") return BinaryOperator("Multiply");
    else throw new Error("Could not lower IR.BinaryOperator");
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

function lowerUnaryInstruction(instruction: IR.UnaryInstruction): Instruction[] {
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

function lowerBinaryInstruction(instruction: IR.BinaryInstruction): Instruction[] {
    return [
        Mov(lowerValue(instruction.first), lowerValue(instruction.dst)),
        BinaryInstruction(lowerBinaryOperator(instruction.operator),
            lowerValue(instruction.second), lowerValue(instruction.dst))
    ];
}

function lowerInstruction(instruction: IR.Instruction): Instruction[] {
    if (instruction.kind === "Return") {
        return [
            Mov(lowerValue(instruction.value), Register("ax")),
            Ret()
        ];
    } else if (instruction.kind === "UnaryInstruction") {
        return lowerUnaryInstruction(instruction);
    } else if (instruction.kind === "BinaryInstruction") {
        return lowerBinaryInstruction(instruction);
    } else {
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

    function replace(operand: Operand): Operand {
        return (operand.kind === "PseudoRegister" ? putOnStack(operand) : operand);
    }

    program.function_defintion.instructions = program.function_defintion.instructions.map(inst => {
        if (inst.kind === "UnaryInstruction") {
            return (inst.operand.kind === "PseudoRegister" ? UnaryInstruction(inst.operator, putOnStack(inst.operand)) : inst);
        } else if (inst.kind === "Mov") {
            return Mov(replace(inst.src), replace(inst.dst));
        } else if (inst.kind === "Compare") {
            return Compare(replace(inst.src), replace(inst.dst));
        } else if (inst.kind === "SetConditionCode") {
            return SetConditionCode(inst.code, replace(inst.operand));
        } else if (inst.kind === "BinaryInstruction") {
            return BinaryInstruction(inst.operator, replace(inst.src), replace(inst.dst));
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

function fixInvalidBinaryInstructions(func: Function) {
    func.instructions = func.instructions.flatMap(inst => {
        if (inst.kind === "BinaryInstruction" && inst.src.kind === "Stack" && inst.dst.kind === "Stack") {
            const first = Mov(inst.src, Register("r10"));
            const second = BinaryInstruction(inst.operator, Register("r10"), inst.dst);
            return [first, second];
        } else if (inst.kind === "BinaryInstruction" && inst.operator.operand === "Multiply" && inst.dst.kind === "Stack") {
            return [
                Mov(inst.dst, Register("r11")),
                BinaryInstruction(inst.operator, inst.src, Register("r11")),
                Mov(Register("r11"), inst.dst)
            ];
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
    fixInvalidBinaryInstructions(program.function_defintion);
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

function emitRet(): string {
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
    if (operator.operator_type === "Not") return `notl`;
    else if (operator.operator_type === "Negate") return `negl`;
    else throw new Error(`Cannot emit unary operator: ${operator}`);
}

function emitUnaryInstruction(unary: UnaryInstruction): string {
    return `${emitUnaryOperator(unary.operator)} ${emitOperand(unary.operand)}`;
}

function emitBinaryOperator(operator: BinaryOperator): string {
    if (operator.operand === "Add") return `addl`;
    else if (operator.operand === "Subtract") return `subl`;
    else if (operator.operand === "Multiply") return `imull`;
    else throw new Error(`Could not emit binary operator: ${JSON.stringify(operator)}`);
}

function emitBinaryInstruction(binary: BinaryInstruction): string {
    return `${emitBinaryOperator(binary.operator)} ${emitOperand(binary.src)}, ${emitOperand(binary.dst)}`;
}

function emitAllocateStack(alloc: AllocateStack): string {
    return `subq $${alloc.size}, %rsp`;
}

function emitInstruction(instruction: Instruction): string {
    if (instruction.kind === "Mov") return `movl ${emitOperand(instruction.src)}, ${emitOperand(instruction.dst)}`;
    else if (instruction.kind === "Ret") return emitRet();
    else if (instruction.kind === "Compare") return emitCompare(instruction);
    else if (instruction.kind === "SetConditionCode") return emitSetConditionCode(instruction);
    else if (instruction.kind === "AllocateStack") return emitAllocateStack(instruction);
    else if (instruction.kind === "UnaryInstruction") return emitUnaryInstruction(instruction);
    else if (instruction.kind === "BinaryInstruction") return emitBinaryInstruction(instruction);
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

