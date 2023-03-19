import { parserTest } from "./statement.test.js";

import { parseExpression } from "../src/parser.js";
import * as Evaluator from "../src/evaluator.js";

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

parserTest(`Parse ternary expression`, `1 + 2 ? 3 : 4`, (scanner) => {
    const expression = parseExpression(scanner);
    assert(
        expression.kind === "TernaryExpression",
        "Parsed as ternary expression"
    );
    assert(expression.condition.kind === "BinaryExpression");
    assert(expression.condition.operator.operand === "Add");
    assert(expression.condition.left.kind === "Constant");
    assert(expression.condition.left.value === 1);
    assert(expression.condition.right.kind === "Constant");
    assert(expression.condition.right.value === 2);

    assert(expression.is_true.kind === "Constant");
    assert(expression.is_true.value === 3);

    assert(expression.is_false.kind === "Constant");
    assert(expression.is_false.value === 4);
});

parserTest(
    `Parse nested ternary expression`,
    `1 ? (1 + 1 ? 2 : 3) : 4`,
    (scanner) => {
        const expression = parseExpression(scanner);
        assert(
            expression.kind === "TernaryExpression",
            "Parsed as ternary expression"
        );
        assert(expression.condition.kind === "Constant");
        assert(expression.condition.value === 1);

        assert(expression.is_true.kind === "TernaryExpression");
        assert(expression.is_true.condition.kind === "BinaryExpression");
        assert(expression.is_true.condition.operator.operand === "Add");
        assert(expression.is_true.condition.left.kind === "Constant");
        assert(expression.is_true.condition.left.value === 1);
        assert(expression.is_true.condition.right.kind === "Constant");
        assert(expression.is_true.condition.right.value === 1);
        assert(expression.is_true.is_true.kind === "Constant");
        assert(expression.is_true.is_true.value === 2);
        assert(expression.is_true.is_false.kind === "Constant");
        assert(expression.is_true.is_false.value === 3);

        assert(expression.is_false.kind === "Constant");
        assert(expression.is_false.value === 4);
    }
);
