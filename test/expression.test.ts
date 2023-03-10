import { parseExpression } from "../src/parser.js";
import { lex, getScanner } from "../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

const testAssignmentToConstantExpression = (params: [string, number]) => {
    test(`Parse assignment expression '${params[0]} = ${params[1]}'`, () => {
        const expression = parseExpression(
            getScanner(lex(`${params[0]} = ${params[1]}`))
        );
        assert(expression.kind === "VariableAssignment");
        assert(expression.dst.identifier.value === params[0]);

        assert(expression.src.kind === "Constant");
        assert(expression.src.value === params[1]);
    });
};
testAssignmentToConstantExpression(["x", 0]);
testAssignmentToConstantExpression(["___x", 123456789]);
