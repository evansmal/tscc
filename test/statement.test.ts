import { parseStatement } from "../src/parser.js";
import { lex, getScanner } from "../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

const testVariableDefinitionStatementWithConstant = (
    params: [string, number]
) => {
    test(`Parse variable definition 'int ${params[0]} = ${params[1]};'`, () => {
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
testVariableDefinitionStatementWithConstant(["a", 0]);
testVariableDefinitionStatementWithConstant(["helloworld", 123456789]);
testVariableDefinitionStatementWithConstant(["a_b_c_d_e", 999]);

const testVariableDeclarationStatement = (params: [string, string]) => {
    test(`Parse variable declaration '${params[0]} ${params[1]};'`, () => {
        const statement = parseStatement(
            getScanner(lex(`${params[0]} ${params[1]};`))
        );
        assert(statement.kind === "VariableDeclaration");
        assert(statement.type.value === params[0]);
        assert(!statement.value);
    });
};
testVariableDeclarationStatement(["int", "a"]);
testVariableDeclarationStatement(["int", "y"]);
testVariableDeclarationStatement(["int", "a_b_c_d_e"]);

test("Parse variable assignment statement 'y = x = 5'", () => {
    const expression = parseStatement(getScanner(lex("y = x = 5;")));
    assert(expression.kind === "VariableAssignment");
    assert(expression.dst.identifier.value === "y");

    assert(expression.src.kind === "VariableAssignment");
    assert(expression.src.src.kind === "Constant");
    assert(expression.src.src.value === 5);
    assert(expression.src.dst.identifier.value === "x");
});
