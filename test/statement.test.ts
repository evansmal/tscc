import {
    Node,
    parseStatement,
    VariableDeclaration,
    VariableReference,
    VariableAssignment,
    BinaryOperator,
    BinaryExpression,
    TernaryExpression,
    IfStatement,
    Return,
    Identifier,
    Constant
} from "../src/parser.js";
import { lex, getScanner, Scanner } from "../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

export function parserTest(
    desc: string,
    code: string,
    f: (scanner: Scanner) => void
) {
    test(`${desc}: '${code}'`, () => {
        const scanner = getScanner(lex(code));
        f(scanner);
    });
}

export function matchNode(actual: Node, expected: Node): void {
    assert.deepStrictEqual(
        actual,
        expected,
        `${actual.kind} is not ${expected.kind}`
    );
}

const testVariableDefinitionStatementWithConstant = (
    params: [string, number]
) => {
    parserTest(
        `Parse variable definition`,
        `int ${params[0]} = ${params[1]};`,
        (scanner) => {
            const statement = parseStatement(scanner);
            matchNode(
                statement,
                VariableDeclaration(
                    Identifier("int"),
                    Identifier(params[0]),
                    Constant(params[1])
                )
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
    matchNode(
        statement,
        VariableAssignment(
            VariableAssignment(Constant(5), VariableReference(Identifier("x"))),
            VariableReference(Identifier("y"))
        )
    );
});

parserTest("Parse if statement", "if(1) { return 1; }", (scanner) => {
    const conditional = parseStatement(scanner);
    matchNode(conditional, IfStatement(Constant(1), [Return(Constant(1))]));
});

parserTest("Parse if statement", "if(1 == 1) { x + y; }", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");
    matchNode(
        conditional,
        IfStatement(
            BinaryExpression(BinaryOperator("Equal"), Constant(1), Constant(1)),
            [
                BinaryExpression(
                    BinaryOperator("Add"),
                    VariableReference(Identifier("x")),
                    VariableReference(Identifier("y"))
                )
            ]
        )
    );
});

parserTest("Parse if statement", "if(2 + 3) return 0;", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");
    matchNode(
        conditional,
        IfStatement(
            BinaryExpression(BinaryOperator("Add"), Constant(2), Constant(3)),
            [Return(Constant(0))]
        )
    );
});

parserTest("Parse if else statement", "if(1) a = 1; else a = 2;", (scanner) => {
    const conditional = parseStatement(scanner);
    matchNode(
        conditional,
        IfStatement(
            Constant(1),
            [
                VariableAssignment(
                    Constant(1),
                    VariableReference(Identifier("a"))
                )
            ],
            [
                VariableAssignment(
                    Constant(2),
                    VariableReference(Identifier("a"))
                )
            ]
        )
    );
});

parserTest(
    "Parse if else statement blocks",
    "if(1) {a = 5;} else {a = 10;}",
    (scanner) => {
        const conditional = parseStatement(scanner);
        matchNode(
            conditional,
            IfStatement(
                Constant(1),
                [
                    VariableAssignment(
                        Constant(5),
                        VariableReference(Identifier("a"))
                    )
                ],
                [
                    VariableAssignment(
                        Constant(10),
                        VariableReference(Identifier("a"))
                    )
                ]
            )
        );
    }
);

parserTest(
    "Parse ternary assignment statement",
    "int b = 1 ? a = 1 : (a = 2);",
    (scanner) => {
        const assignment = parseStatement(scanner);
        matchNode(
            assignment,
            VariableDeclaration(
                Identifier("int"),
                Identifier("b"),
                TernaryExpression(
                    Constant(1),
                    VariableAssignment(
                        Constant(1),
                        VariableReference(Identifier("a"))
                    ),
                    VariableAssignment(
                        Constant(2),
                        VariableReference(Identifier("a"))
                    )
                )
            )
        );
    }
);
