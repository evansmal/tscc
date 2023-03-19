import { parseStatement } from "../src/parser.js";
import { lex, getScanner, Scanner } from "../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

export function parserTest(
    desc: string,
    code: string,
    fn: (scanner: Scanner) => void
) {
    test(`${desc}: '${code}'`, () => {
        const scanner = getScanner(lex(code));
        fn(scanner);
    });
}

const testVariableDefinitionStatementWithConstant = (
    params: [string, number]
) => {
    parserTest(
        `Parse variable definition`,
        `int ${params[0]} = ${params[1]};`,
        (scanner) => {
            const statement = parseStatement(scanner);
            assert(statement.kind === "VariableDeclaration");
            assert(statement.identifier.value === params[0]);
            assert(statement.value);
            assert(
                statement.value.kind === "Constant" &&
                    statement.value.value === params[1]
            );
        }
    );
};
testVariableDefinitionStatementWithConstant(["a", 0]);
testVariableDefinitionStatementWithConstant(["helloworld", 123456789]);
testVariableDefinitionStatementWithConstant(["a_b_c_d_e", 999]);

const testVariableDeclarationStatement = (params: [string, string]) => {
    parserTest(
        `Parse variable declaration`,
        `${params[0]} ${params[1]};`,
        (scanner) => {
            const statement = parseStatement(scanner);
            assert(statement.kind === "VariableDeclaration");
            assert(statement.type.value === params[0]);
            assert(!statement.value);
        }
    );
};
testVariableDeclarationStatement(["int", "a"]);
testVariableDeclarationStatement(["int", "y"]);
testVariableDeclarationStatement(["int", "a_b_c_d_e"]);

parserTest("Parse variable assignment statement", "y = x = 5;", (scanner) => {
    const statement = parseStatement(scanner);
    assert(statement.kind === "VariableAssignment");
    assert(statement.dst.identifier.value === "y");

    assert(statement.src.kind === "VariableAssignment");
    assert(statement.src.src.kind === "Constant");
    assert(statement.src.src.value === 5);
    assert(statement.src.dst.identifier.value === "x");
});

parserTest("Parse if statement", "if(1) { return 1; }", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");
    assert(conditional.condition.kind === "Constant");
    assert(conditional.condition.value === 1);

    assert(conditional.body.length === 1);
    assert(conditional.body[0].kind === "Return");
});

parserTest("Parse if statement", "if(1 == 1) { x + y; }", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");

    assert(conditional.condition.kind === "BinaryExpression");
    assert(conditional.condition.operator.operand === "Equal");
    assert(conditional.condition.left.kind === "Constant");
    assert(conditional.condition.left.value === 1);
    assert(conditional.condition.right.kind === "Constant");
    assert(conditional.condition.right.value === 1);

    assert(conditional.body.length === 1);
    assert(conditional.body[0].kind === "BinaryExpression");
    assert(conditional.body[0].left.kind === "VariableReference");
    assert(conditional.body[0].right.kind === "VariableReference");
});

parserTest("Parse if statement", "if(2 + 3) return 0;", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");

    assert(conditional.condition.kind === "BinaryExpression");
    assert(conditional.condition.operator.operand === "Add");
    assert(conditional.condition.left.kind === "Constant");
    assert(conditional.condition.left.value === 2);
    assert(conditional.condition.right.kind === "Constant");
    assert(conditional.condition.right.value === 3);

    assert(conditional.body.length === 1);
    assert(conditional.body[0].kind === "Return");
});

parserTest("Parse if else statement", "if(1) a = 1; else a = 2;", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");

    assert(conditional.body.length === 1);

    assert(conditional.else_body);
    assert(conditional.else_body.length === 1);
});

parserTest(
    "Parse if else statement blocks",
    "if(1) {a = 1;} else {a = 2;}",
    (scanner) => {
        const conditional = parseStatement(scanner);
        assert(conditional.kind === "IfStatement");

        assert(conditional.body.length === 1);

        assert(conditional.else_body);
        assert(conditional.else_body.length === 1);
    }
);