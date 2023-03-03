import { parseStatement, parseExpression } from "../src/parser.js";
import { lex, getScanner } from "../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

const testConstantDeclaration = (params: [string, number]) => {
    test("Parse variable declaration", () => {
        const statement = parseStatement(
            getScanner(lex(`int ${params[0]} = ${params[1]};`))
        );
        assert(statement.kind === "VariableDeclaration");
        assert(statement.identifier.value === params[0]);
        assert(statement.value);
        assert(
            statement.value.kind === "Constant" &&
                statement.value.value === params[1]
        );
    });
};
testConstantDeclaration(["a", 0]);
testConstantDeclaration(["helloworld", 123456789]);
testConstantDeclaration(["a_b_c_d_e", 999]);

test("Parse assignment expression", () => {
    const expression = parseExpression(getScanner(lex("x = 4")));
    assert(expression.kind === "VariableAssignment");
    assert(expression.dst.identifier.value === "x");

    assert(expression.src.kind === "Constant");
    assert(expression.src.value === 4);
});

test("Parse assignment expression", () => {
    const expression = parseExpression(getScanner(lex("y = x = 5")));
    assert(expression.kind === "VariableAssignment");
    assert(expression.dst.identifier.value === "y");

    assert(expression.src.kind === "VariableAssignment");
    assert(expression.src.src.kind === "Constant");
    assert(expression.src.src.value === 5);
    assert(expression.src.dst.identifier.value === "x");
});
