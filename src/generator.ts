import * as IR from "./ir.js";

import { inspect } from "node:util";

interface Identifier {
    kind: "Identifier";
    value: string;
}

function Identifier(name: string): Identifier {
    return { kind: "Identifier", value: name };
}

interface Program {
    kind: "Program";
    function_definition: Function[];
}

interface Function {
    kind: "Function";
    name: Identifier;
    instructions: InstructionX86[];
}

function Function(name: Identifier, instructions: InstructionX86[]): Function {
    return { kind: "Function", name, instructions };
}

interface Imm {
    kind: "Imm";
    value: number;
}

function Imm(value: number): Imm {
    return { kind: "Imm", value };
}

type RegisterName =
    | "ax"
    | "cx"
    | "dx"
    | "r8"
    | "r9"
    | "r10"
    | "r11"
    | "si"
    | "di"
    | "sp";

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

function PseudoRegister(identifier: Identifier): PseudoRegister {
    return { kind: "PseudoRegister", identifier };
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
    return { kind: "Compare", src, dst };
}

type ConditionCode = "E" | "NE" | "L" | "LE" | "G" | "GE";

interface SetConditionCode {
    kind: "SetConditionCode";
    code: ConditionCode;
    operand: Operand;
}

function SetConditionCode(
    code: ConditionCode,
    operand: Operand
): SetConditionCode {
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

function UnaryInstruction(
    operator: UnaryOperator,
    operand: Operand
): UnaryInstruction {
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

export function BinaryInstruction(
    operator: BinaryOperator,
    src: Operand,
    dst: Operand
): BinaryInstruction {
    return { kind: "BinaryInstruction", operator, src, dst };
}

interface AllocateStack {
    kind: "AllocateStack";
    size: number;
}

function AllocateStack(size: number): AllocateStack {
    return { kind: "AllocateStack", size };
}

interface CDQ {
    kind: "CDQ";
}

function CDQ(): CDQ {
    return { kind: "CDQ" };
}

interface IDiv {
    kind: "IDiv";
    operand: Operand;
}

function IDiv(operand: Operand): IDiv {
    return { kind: "IDiv", operand };
}

interface Jmp {
    kind: "Jmp";
    identifier: Identifier;
}

function Jmp(identifier: Identifier): Jmp {
    return { kind: "Jmp", identifier };
}

interface JmpCC {
    kind: "JmpCC";
    condition: ConditionCode;
    identifier: Identifier;
}

function JmpCC(condition: ConditionCode, identifier: Identifier): JmpCC {
    return { kind: "JmpCC", condition, identifier };
}

interface SetCC {
    kind: "SetCC";
    condition: ConditionCode;
    operand: Operand;
}

function SetCC(condition: ConditionCode, operand: Operand): SetCC {
    return { kind: "SetCC", condition, operand };
}

interface Label {
    kind: "Label";
    identifier: Identifier;
}

function Label(identifier: Identifier): Label {
    return { kind: "Label", identifier };
}

export interface Call {
    kind: "Call";
    name: Identifier;
}

function Call(name: Identifier): Call {
    return { kind: "Call", name };
}

type InstructionX86 =
    | Mov
    | Compare
    | SetConditionCode
    | UnaryInstruction
    | BinaryInstruction
    | AllocateStack
    | Ret
    | CDQ
    | IDiv
    | Jmp
    | JmpCC
    | SetCC
    | Label
    | Call;

function lowerUnaryOperator(operator: IR.UnaryOperator): UnaryOperator {
    if (operator === "Complement")
        return { kind: "UnaryOperator", operator_type: "Not" };
    else if (operator === "Negate")
        return { kind: "UnaryOperator", operator_type: "Negate" };
    else
        throw new Error(
            `Could not lower IR.UnaryOperator type '${inspect(operator)}'`
        );
}

function lowerBinaryOperator(operator: IR.BinaryOperator): BinaryOperator {
    if (
        operator !== "Divide" &&
        operator !== "Mod" &&
        operator !== "Less" &&
        operator !== "LessOrEqual" &&
        operator !== "Greater" &&
        operator !== "GreaterOrEqual" &&
        operator !== "NotEqual" &&
        operator !== "Equal"
    )
        return BinaryOperator(operator);
    else throw new Error("Cannot lower IR.BinaryOperator");
}

function lowerValue(value: IR.Value): Operand {
    if (value.kind === "ConstantInteger") {
        return {
            kind: "Imm",
            value: value.value
        };
    } else if (value.kind === "Variable") {
        return {
            kind: "PseudoRegister",
            identifier: value.identifier
        };
    } else {
        throw new Error(`Could not lower IR.Value type '${inspect(value)}'`);
    }
}

function lowerUnaryInstruction(
    instruction: IR.UnaryInstruction
): InstructionX86[] {
    if (instruction.operator === "LogicalNot") {
        const dst = lowerValue(instruction.dst);
        return [
            Compare(Imm(0), lowerValue(instruction.src)),
            Mov(Imm(0), dst),
            SetConditionCode("E", dst)
        ];
    } else if (
        instruction.operator === "Negate" ||
        instruction.operator === "Complement"
    ) {
        return [
            Mov(lowerValue(instruction.src), lowerValue(instruction.dst)),
            UnaryInstruction(
                lowerUnaryOperator(instruction.operator),
                lowerValue(instruction.dst)
            )
        ];
    } else {
        throw new Error(
            `Could not lower IR.UnaryInstruction type '${inspect(instruction)}'`
        );
    }
}

function lowerRelationalBinaryInstruction(
    instruction: IR.BinaryInstruction,
    condition: ConditionCode
) {
    return [
        Compare(lowerValue(instruction.second), lowerValue(instruction.first)),
        Mov(Imm(0), lowerValue(instruction.dst)),
        SetCC(condition, lowerValue(instruction.dst))
    ];
}

function lowerBinaryInstruction(
    instruction: IR.BinaryInstruction
): InstructionX86[] {
    if (instruction.operator === "Divide") {
        return [
            Mov(lowerValue(instruction.first), Register("ax")),
            CDQ(),
            IDiv(lowerValue(instruction.second)),
            Mov(Register("ax"), lowerValue(instruction.dst))
        ];
    } else if (instruction.operator === "Mod") {
        return [
            Mov(lowerValue(instruction.first), Register("ax")),
            CDQ(),
            IDiv(lowerValue(instruction.second)),
            Mov(Register("dx"), lowerValue(instruction.dst))
        ];
    } else if (instruction.operator === "Equal") {
        return lowerRelationalBinaryInstruction(instruction, "E");
    } else if (instruction.operator === "NotEqual") {
        return lowerRelationalBinaryInstruction(instruction, "NE");
    } else if (instruction.operator === "Less") {
        return lowerRelationalBinaryInstruction(instruction, "L");
    } else if (instruction.operator === "LessOrEqual") {
        return lowerRelationalBinaryInstruction(instruction, "LE");
    } else if (instruction.operator === "Greater") {
        return lowerRelationalBinaryInstruction(instruction, "G");
    } else if (instruction.operator === "GreaterOrEqual") {
        return lowerRelationalBinaryInstruction(instruction, "GE");
    } else if (
        instruction.operator === "Multiply" ||
        instruction.operator === "Subtract" ||
        instruction.operator === "Add"
    ) {
        return [
            Mov(lowerValue(instruction.first), lowerValue(instruction.dst)),
            BinaryInstruction(
                lowerBinaryOperator(instruction.operator),
                lowerValue(instruction.second),
                lowerValue(instruction.dst)
            )
        ];
    } else {
        throw new Error(
            `Cannot lower IR.BinaryInstruction: ${inspect(instruction)}`
        );
    }
}

function lowerJumpIfZero(instruction: IR.JumpIfZero): InstructionX86[] {
    return [
        Compare(Imm(0), lowerValue(instruction.condition)),
        JmpCC("E", instruction.target)
    ];
}

function lowerJumpIfNotZero(instruction: IR.JumpIfNotZero): InstructionX86[] {
    return [
        Compare(Imm(0), lowerValue(instruction.condition)),
        JmpCC("NE", instruction.target)
    ];
}

function lowerJump(instruction: IR.Jump): InstructionX86[] {
    return [Jmp(instruction.target)];
}

function lowerLabel(instruction: IR.Label): InstructionX86[] {
    return [Label(instruction.identifier)];
}

function lowerFunctionCall(instruction: IR.FunctionCall): InstructionX86[] {
    if (instruction.args.length > 6)
        throw new Error(
            "Cannot handle more than a single argument when calling functions"
        );
    const registers: RegisterName[] = ["di", "si", "dx", "cx", "r8", "r9"];
    const setup: InstructionX86[] = [];
    for (let i = 0; i < Math.min(instruction.args.length, 6); i++) {
        setup.push(
            Mov(lowerValue(instruction.args[i]), Register(registers[i]))
        );
    }
    return [
        ...setup,
        Call(instruction.name),
        Mov(Register("ax"), lowerValue(instruction.dst))
    ];
}

function lowerInstruction(instruction: IR.Instruction): InstructionX86[] {
    if (instruction.kind === "Return") {
        return [Mov(lowerValue(instruction.value), Register("ax")), Ret()];
    } else if (instruction.kind === "UnaryInstruction") {
        return lowerUnaryInstruction(instruction);
    } else if (instruction.kind === "BinaryInstruction") {
        return lowerBinaryInstruction(instruction);
    } else if (instruction.kind === "Jump") {
        return lowerJump(instruction);
    } else if (instruction.kind === "JumpIfZero") {
        return lowerJumpIfZero(instruction);
    } else if (instruction.kind === "JumpIfNotZero") {
        return lowerJumpIfNotZero(instruction);
    } else if (instruction.kind === "Copy") {
        return [Mov(lowerValue(instruction.src), lowerValue(instruction.dst))];
    } else if (instruction.kind === "Label") {
        return lowerLabel(instruction);
    } else if (instruction.kind === "FunctionCall") {
        return lowerFunctionCall(instruction);
    } else {
        throw new Error(
            `Could not lower IR.Instruction type '${inspect(instruction)}'`
        );
    }
}

function lowerFunction(func: IR.Function): Function {
    const setup_params: InstructionX86[] = [];
    const registers: RegisterName[] = ["di", "si", "dx", "cx", "r8", "r9"];
    for (let i = 0; i < Math.min(func.parameters.length, 6); i++) {
        setup_params.push(
            Mov(Register(registers[i]), PseudoRegister(func.parameters[i]))
        );
    }
    if (func.parameters.length > 6)
        throw new Error(
            "Functions with more than 6 parameters are not support"
        );

    const body = func.body.flatMap(lowerInstruction);

    const f = Function(func.name, [...setup_params, ...body]);
    const total_offset = replacePseudoRegister(f);

    // This needs to be positive, but offset grows downwards
    const stack_size = total_offset * -1;
    insertStackAllocation(f, stack_size);

    fixInvalidMovInstructions(f);
    fixInvalidCompareInstructions(f);
    fixInvalidBinaryInstructions(f);
    fixInvalidIDivInstructions(f);
    return f;
}

function replacePseudoRegister(func: Function): number {
    let total_offset = 0;
    const offsets = new Map<string, Stack>();

    const putOnStack = (reg: PseudoRegister) => {
        if (!offsets.has(reg.identifier.value)) {
            total_offset -= 4;
            offsets.set(reg.identifier.value, Stack(total_offset));
        }
        return offsets.get(reg.identifier.value) as Stack;
    };

    function replace(operand: Operand): Operand {
        return operand.kind === "PseudoRegister"
            ? putOnStack(operand)
            : operand;
    }

    func.instructions = func.instructions.map((inst) => {
        if (inst.kind === "UnaryInstruction") {
            return inst.operand.kind === "PseudoRegister"
                ? UnaryInstruction(inst.operator, putOnStack(inst.operand))
                : inst;
        } else if (inst.kind === "Mov") {
            return Mov(replace(inst.src), replace(inst.dst));
        } else if (inst.kind === "Compare") {
            return Compare(replace(inst.src), replace(inst.dst));
        } else if (inst.kind === "SetConditionCode") {
            return SetConditionCode(inst.code, replace(inst.operand));
        } else if (inst.kind === "BinaryInstruction") {
            return BinaryInstruction(
                inst.operator,
                replace(inst.src),
                replace(inst.dst)
            );
        } else if (inst.kind === "IDiv") {
            return IDiv(replace(inst.operand));
        } else if (inst.kind === "SetCC") {
            return SetCC(inst.condition, replace(inst.operand));
        } else if (
            inst.kind === "Ret" ||
            inst.kind === "AllocateStack" ||
            inst.kind === "CDQ" ||
            inst.kind === "Label" ||
            inst.kind === "Jmp" ||
            inst.kind === "JmpCC" ||
            inst.kind === "Call"
        ) {
            return inst;
        } else
            throw new Error(
                `Unexpected instruction encountered when trying to replaced pseudoregisters: ${inspect(
                    inst
                )}`
            );
    });
    return total_offset;
}

function insertStackAllocation(func: Function, total_offset: number) {
    func.instructions = [AllocateStack(total_offset), ...func.instructions];
}

function fixInvalidMovInstructions(func: Function) {
    func.instructions = func.instructions.flatMap((inst) => {
        if (
            inst.kind === "Mov" &&
            inst.src.kind === "Stack" &&
            inst.dst.kind === "Stack"
        ) {
            const first = Mov(inst.src, Register("r10"));
            const second = Mov(Register("r10"), inst.dst);
            return [first, second];
        } else {
            return inst;
        }
    });
}

function fixInvalidCompareInstructions(func: Function) {
    func.instructions = func.instructions.flatMap((inst) => {
        if (
            inst.kind === "Compare" &&
            inst.src.kind === "Stack" &&
            inst.dst.kind === "Stack"
        ) {
            const first = Mov(inst.src, Register("r10"));
            const second = Compare(Register("r10"), inst.dst);
            return [first, second];
        } else if (inst.kind === "Compare" && inst.dst.kind === "Imm") {
            const first = Mov(inst.dst, Register("r11"));
            const second = Compare(inst.src, Register("r11"));
            return [first, second];
        } else {
            return inst;
        }
    });
}

function fixInvalidBinaryInstructions(func: Function) {
    func.instructions = func.instructions.flatMap((inst) => {
        if (inst.kind === "BinaryInstruction") {
            if (
                inst.src.kind === "Stack" &&
                inst.dst.kind === "Stack" &&
                (inst.operator.operand === "Add" ||
                    inst.operator.operand === "Subtract")
            ) {
                const first = Mov(inst.src, Register("r10"));
                const second = BinaryInstruction(
                    inst.operator,
                    Register("r10"),
                    inst.dst
                );
                return [first, second];
            } else if (
                inst.operator.operand === "Multiply" &&
                inst.dst.kind === "Stack"
            ) {
                return [
                    Mov(inst.dst, Register("r11")),
                    BinaryInstruction(inst.operator, inst.src, Register("r11")),
                    Mov(Register("r11"), inst.dst)
                ];
            }
        }
        return inst;
    });
}

function fixInvalidIDivInstructions(func: Function) {
    func.instructions = func.instructions.flatMap((inst) => {
        if (inst.kind === "IDiv" && inst.operand.kind === "Imm") {
            const first = Mov(inst.operand, Register("r10"));
            const second = IDiv(Register("r10"));
            return [first, second];
        } else {
            return inst;
        }
    });
}

export function generate(ir: IR.Program): Program {
    const program: Program = {
        kind: "Program",
        function_definition: ir.functions.map(lowerFunction)
    };
    return program;
}

function operandToString(operand: Operand): string {
    if (operand.kind === "Imm") return `${operand.value}`;
    else if (operand.kind === "Register") return operand.name;
    else if (operand.kind === "PseudoRegister")
        return `${operand.identifier.value}`;
    else if (operand.kind === "Stack") return `stack[${operand.address}]`;
    else throw new Error("Cannot convert operand to string");
}

function binaryOperatorToString(operator: BinaryOperator): string {
    if (operator.operand === "Add") return "ADD";
    else if (operator.operand === "Multiply") return "MUL";
    else if (operator.operand === "Subtract") return "SUB";
    else throw new Error("Cannot lower binary operator to string");
}

function binaryInstructionToString(instruction: BinaryInstruction) {
    let output = `${binaryOperatorToString(instruction.operator)}`;
    output += ` ${operandToString(instruction.src)}, ${operandToString(
        instruction.dst
    )}`;
    return output;
}

function unaryInstructionToString(instruction: UnaryInstruction) {
    let output = "";
    if (instruction.operator.operator_type === "Negate") {
        output += `NEG ${operandToString(instruction.operand)}`;
    } else if (instruction.operator.operator_type === "Not") {
        output += `NOT ${operandToString(instruction.operand)}`;
    } else {
        throw new Error("Cannot lower operand type to string");
    }
    return output;
}

export function toString(program: Program): string {
    return inspect(program, { depth: 99, colors: true });
}

function emitRegister(register: Register): string {
    if (register.name === "ax") return `%eax`;
    else if (register.name === "cx") return `%ecx`;
    else if (register.name === "dx") return `%edx`;
    else if (register.name === "sp") return `%rsp`;
    else if (register.name === "di") return `%edi`;
    else if (register.name === "si") return `%esi`;
    else if (register.name === "r8") return `%r8d`;
    else if (register.name === "r9") return `%r9d`;
    else if (register.name === "r10") return `%r10d`;
    else if (register.name === "r11") return `%r11d`;
    else throw new Error(`Cannot emit register ${inspect(register)}`);
}

function emitOperand(operand: Operand): string {
    if (operand.kind === "Imm") return `$${operand.value}`;
    else if (operand.kind === "Register") return emitRegister(operand);
    else if (operand.kind === "Stack") return `${operand.address}(%rbp)`;
    else throw new Error(`Cannot emit operand: ${inspect(operand)}`);
}

function emitRet(): string {
    let res = `movq %rbp, %rsp\n`;
    res += `\tpopq %rbp\n`;
    res += `\tret`;
    return res;
}

function emitCompare(instruction: Compare): string {
    return `cmpl ${emitOperand(instruction.src)}, ${emitOperand(
        instruction.dst
    )}`;
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
    else
        throw new Error(`Could not emit binary operator: ${inspect(operator)}`);
}

function emitBinaryInstruction(binary: BinaryInstruction): string {
    return `${emitBinaryOperator(binary.operator)} ${emitOperand(
        binary.src
    )}, ${emitOperand(binary.dst)}`;
}

function emitAllocateStack(alloc: AllocateStack): string {
    return `subq $${alloc.size}, %rsp`;
}

function emitIDivInstruction(idiv: IDiv): string {
    return `idivl ${emitOperand(idiv.operand)}`;
}

function emitCdq(): string {
    return `cdq`;
}

function emitJmp(jmp: Jmp): string {
    return `jmp .${jmp.identifier.value}`;
}

function emitJmpCC(jmp: JmpCC): string {
    return `j${jmp.condition.toLowerCase()} .${jmp.identifier.value}`;
}

function emitSetCC(set: SetCC): string {
    return `set${set.condition.toLowerCase()} ${emitOperand(set.operand)}`;
}

function emitLabel(label: Label): string {
    return `\n.${label.identifier.value}\:`;
}

function emitCall(instruction: Call): string {
    return `call ${instruction.name.value}`;
}

function emitInstruction(instruction: InstructionX86): string {
    if (instruction.kind === "Mov")
        return `movl ${emitOperand(instruction.src)}, ${emitOperand(
            instruction.dst
        )}`;
    else if (instruction.kind === "Ret") return emitRet();
    else if (instruction.kind === "Compare") return emitCompare(instruction);
    else if (instruction.kind === "SetConditionCode")
        return emitSetConditionCode(instruction);
    else if (instruction.kind === "AllocateStack")
        return emitAllocateStack(instruction);
    else if (instruction.kind === "UnaryInstruction")
        return emitUnaryInstruction(instruction);
    else if (instruction.kind === "BinaryInstruction")
        return emitBinaryInstruction(instruction);
    else if (instruction.kind === "IDiv")
        return emitIDivInstruction(instruction);
    else if (instruction.kind === "CDQ") return emitCdq();
    else if (instruction.kind === "Jmp") return emitJmp(instruction);
    else if (instruction.kind === "JmpCC") return emitJmpCC(instruction);
    else if (instruction.kind === "SetCC") return emitSetCC(instruction);
    else if (instruction.kind === "Label") return emitLabel(instruction);
    else if (instruction.kind === "Call") return emitCall(instruction);
    else throw new Error(`Cannot emit instruction: ${inspect(instruction)}`);
}

function emitFunctionBody(func: Function): string {
    return `\t.globl ${func.name.value}
${func.name.value}:
\tpushq %rbp
\tmovq %rsp, %rbp
\t${func.instructions.map(emitInstruction).join("\n\t")}`;
}

function emitFunction(func: Function): string {
    const should_add_return =
        func.name.value === "main" &&
        func.instructions[func.instructions.length - 1].kind !== "Ret";
    if (should_add_return) {
        return (
            emitFunctionBody(func) +
            `\n\t${emitInstruction(
                Mov(Imm(0), Register("ax"))
            )}\n\t${emitRet()}`
        );
    } else return emitFunctionBody(func);
}

export function emit(program: Program): string {
    return program.function_definition.map(emitFunction).join("\n\n");
}
