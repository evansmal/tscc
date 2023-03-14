import { parserTest } from "./statement.test.js";

import { parseExpression } from "../src/parser.js";
import { lex, getScanner } from "../src/lexer.js";
import * as Evaluator from "../src/evaluator.js";

import test from "node:test";
import assert from "node:assert";

const testAssignmentToConstantExpression = (params: [string, number]) => {
    parserTest(
        `Parse assignment expression`,
        `${params[0]} = ${params[1]}`,
        (scanner) => {
            const expression = parseExpression(scanner);
            assert(expression.kind === "VariableAssignment");
            assert(expression.dst.identifier.value === params[0]);

            assert(expression.src.kind === "Constant");
            assert(expression.src.value === params[1]);
            assert(Evaluator.walkExpression(expression) === params[1]);
        }
    );
};
testAssignmentToConstantExpression(["x", 0]);
testAssignmentToConstantExpression(["___x", 123456789]);

const testBinaryOperationExpression = (
    left: number,
    op: string,
    right: number
) => {
    parserTest(
        `Parse assignment expression`,
        `${left} ${op} ${right}`,
        (scanner) => {
            const expression = parseExpression(scanner);
            assert(expression.kind === "BinaryExpression");

            assert(expression.left.kind === "Constant");
            assert(expression.left.value === left);

            assert(expression.right.kind === "Constant");
            assert(expression.right.value === right);

            // TODO: Does eval always work here?
            assert(
                Evaluator.walkExpression(expression) ===
                    eval(`${left} ${op} ${right}`)
            );
        }
    );
};
testBinaryOperationExpression(4, "+", 2);
testBinaryOperationExpression(10, "-", 8);
testBinaryOperationExpression(2, "/", 3);
testBinaryOperationExpression(11, "*", 1);
