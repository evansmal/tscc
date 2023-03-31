import { parserTest, matchNode } from "./common.test.js";

import {
    parseExpression,
    VariableAssignment,
    Constant,
    FunctionCall,
    Identifier,
    VariableReference
} from "../src/parser.js";
import * as Evaluator from "../src/evaluator.js";

import assert from "node:assert";

const testAssignmentToConstantExpression = (params: [string, number]) => {
    parserTest(
        `Parse assignment expression`,
        `${params[0]} = ${params[1]}`,
        (scanner) => {
            const expression = parseExpression(scanner);
            matchNode(
                expression,
                VariableAssignment(
                    Constant(params[1]),
                    VariableReference(Identifier(params[0]))
                )
            );
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
            matchNode(expression.left, Constant(left));
            matchNode(expression.right, Constant(right));

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
    matchNode(expression.condition.left, Constant(1));
    matchNode(expression.condition.right, Constant(2));

    matchNode(expression.is_true, Constant(3));
    matchNode(expression.is_false, Constant(4));
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
        matchNode(expression.condition, Constant(1));
        assert(expression.is_true.kind === "TernaryExpression");
        assert(expression.is_true.condition.kind === "BinaryExpression");
        assert(expression.is_true.condition.operator.operand === "Add");
        matchNode(expression.is_true.condition.left, Constant(1));
        matchNode(expression.is_true.condition.right, Constant(1));
        matchNode(expression.is_true.is_true, Constant(2));
        matchNode(expression.is_true.is_false, Constant(3));
        matchNode(expression.is_false, Constant(4));
    }
);

parserTest(`Parse function call without arguments`, `a()`, (scanner) => {
    const expression = parseExpression(scanner);
    matchNode(expression, FunctionCall(Identifier("a"), []));
});

parserTest(`Parse function call`, `hello(1, 2, 3)`, (scanner) => {
    const expression = parseExpression(scanner);
    matchNode(
        expression,
        FunctionCall(Identifier("hello"), [
            Constant(1),
            Constant(2),
            Constant(3)
        ])
    );
});
