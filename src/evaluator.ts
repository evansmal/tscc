import * as Parser from "./parser.js";

type Value = number | boolean;

type Environment = Record<string, Value>;

const environment: Environment = {};

function walkUnaryExpression(expression: Parser.UnaryExpression): number {
    if (expression.operator.operand === "Complement")
        return ~walkExpression(expression.expression);
    else if (expression.operator.operand === "Negate")
        return -walkExpression(expression.expression);
    else throw new Error("Unsupported unary operator");
}

function walkBinaryExpression(expression: Parser.BinaryExpression): Value {
    const left = Number(walkExpression(expression.left));
    const right = Number(walkExpression(expression.right));
    if (expression.operator.operand === "Add") {
        return left + right;
    } else if (expression.operator.operand === "Subtract") {
        return left - right;
    } else if (expression.operator.operand === "Multiply") {
        return left * right;
    } else if (expression.operator.operand === "Divide") {
        return left / right;
    } else if (expression.operator.operand === "Mod") {
        return left % right;
    } else if (expression.operator.operand === "And") {
        return left && right;
    } else if (expression.operator.operand === "Or") {
        return left || right;
    } else if (expression.operator.operand === "Greater") {
        return left > right;
    } else if (expression.operator.operand === "GreaterOrEqual") {
        return left >= right;
    } else if (expression.operator.operand === "Less") {
        return left < right;
    } else if (expression.operator.operand === "LessOrEqual") {
        return left <= right;
    } else {
        throw new Error("Unsupported binary expression");
    }
}

export function walkExpression(expression: Parser.Expression): Value {
    if (expression.kind === "Constant") {
        return expression.value;
    } else if (expression.kind === "UnaryExpression") {
        return walkUnaryExpression(expression);
    } else if (expression.kind === "BinaryExpression") {
        return Number(walkBinaryExpression(expression));
    } else if (
        expression.kind === "VariableAssignment" &&
        expression.dst.kind === "VariableReference"
    ) {
        const value = Number(walkExpression(expression.src));
        environment[expression.dst.identifier.value] = value;
        return value;
    } else if (expression.kind === "VariableReference") {
        const id = environment[expression.identifier.value];
        if (!id) {
            throw new Error("Cannot find identifier");
        }
        return id;
    } else throw new Error("Unsupported expression type");
}

export function walk(program: Parser.Program): number {
    let return_value = 0;
    program.declarations.forEach((fn) => {
        if (fn.kind === "FunctionDeclaration") {
            console.log("Got a declaration but not doing anything");
        } else {
            fn.body.body.forEach((statement) => {
                if (statement.kind === "Return") {
                    return_value = Number(walkExpression(statement.expr));
                } else if (statement.kind === "VariableDeclaration") {
                    environment[statement.identifier.value] = statement.value
                        ? walkExpression(statement.value)
                        : 0;
                } else if (statement.kind === "IfStatement") {
                    throw new Error("IfStatement is unsupported");
                } else if (statement.kind === "CompoundStatement") {
                    throw new Error("CompoundStatement is unsupported");
                } else if (statement.kind === "NullStatement") {
                    // Do nothing
                } else if (statement.kind === "ForStatement") {
                    throw new Error("ForStatement is unsupported");
                } else {
                    const _ = walkExpression(statement);
                }
            });
        }
    });
    return return_value;
}
