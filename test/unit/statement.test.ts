import {
    parseStatement,
    VariableDeclaration,
    VariableReference,
    VariableAssignment,
    ExpressionStatement,
    BinaryOperator,
    BinaryExpression,
    TernaryExpression,
    IfStatement,
    ForStatement,
    WhileStatement,
    CompoundStatement,
    NullStatement,
    Return,
    Identifier,
    Constant
} from "../../src/parser.js";

import assert from "node:assert";

import { parserTest, matchNode } from "./common.test.js";

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

parserTest("Parse variable assignment expression statement", "y = x = 5;", (scanner) => {
    const statement = parseStatement(scanner);
    matchNode(
        statement,
        ExpressionStatement(
            VariableAssignment(
                VariableAssignment(
                    Constant(5),
                    VariableReference(Identifier("x"))
                ),
                VariableReference(Identifier("y"))
            )
        )
    );
});

parserTest("Parse if statement", "if(1) { return 1; }", (scanner) => {
    const conditional = parseStatement(scanner);
    matchNode(
        conditional,
        IfStatement(Constant(1), CompoundStatement([Return(Constant(1))]))
    );
});

parserTest("Parse if statement", "if(1 == 1) { x + y; }", (scanner) => {
    const conditional = parseStatement(scanner);
    assert(conditional.kind === "IfStatement");
    matchNode(
        conditional,
        IfStatement(
            BinaryExpression(BinaryOperator("Equal"), Constant(1), Constant(1)),
            CompoundStatement([
                ExpressionStatement(
                    BinaryExpression(
                        BinaryOperator("Add"),
                        VariableReference(Identifier("x")),
                        VariableReference(Identifier("y"))
                    )
                )
            ])
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
            CompoundStatement([Return(Constant(0))])
        )
    );
});

parserTest("Parse if else statement", "if(1) a = 1; else a = 2;", (scanner) => {
    const conditional = parseStatement(scanner);
    matchNode(
        conditional,
        IfStatement(
            Constant(1),
            CompoundStatement([
                ExpressionStatement(
                    VariableAssignment(
                        Constant(1),
                        VariableReference(Identifier("a"))
                    )
                )
            ]),
            CompoundStatement([
                ExpressionStatement(
                    VariableAssignment(
                        Constant(2),
                        VariableReference(Identifier("a"))
                    )
                )
            ])
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
                CompoundStatement([
                    ExpressionStatement(
                        VariableAssignment(
                            Constant(5),
                            VariableReference(Identifier("a"))
                        )
                    )
                ]),
                CompoundStatement([
                    ExpressionStatement(
                        VariableAssignment(
                            Constant(10),
                            VariableReference(Identifier("a"))
                        )
                    )
                ])
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

parserTest(
    "Parse compound statement",
    "{ int x; { int x; int y; } }",
    (scanner) => {
        const statement = parseStatement(scanner);
        matchNode(
            statement,
            CompoundStatement([
                VariableDeclaration(Identifier("int"), Identifier("x")),
                CompoundStatement([
                    VariableDeclaration(Identifier("int"), Identifier("x")),
                    VariableDeclaration(Identifier("int"), Identifier("y"))
                ])
            ])
        );
    }
);

parserTest(
    "Parse null statement",
    "{ int x;; int y;;; x + 123456789; }",
    (scanner) => {
        const statement = parseStatement(scanner);
        matchNode(
            statement,
            CompoundStatement([
                VariableDeclaration(Identifier("int"), Identifier("x")),
                NullStatement(),
                VariableDeclaration(Identifier("int"), Identifier("y")),
                NullStatement(),
                NullStatement(),
                ExpressionStatement(
                    BinaryExpression(
                        BinaryOperator("Add"),
                        VariableReference(Identifier("x")),
                        Constant(123456789)
                    )
                )
            ])
        );
    }
);

parserTest("Parse for statement", "for(int x = 0; x < 3; x) x;", (scanner) => {
    const statement = parseStatement(scanner);
    matchNode(
        statement,
        ForStatement(
            VariableDeclaration(
                Identifier("int"),
                Identifier("x"),
                Constant(0)
            ),
            BinaryExpression(
                BinaryOperator("Less"),
                VariableReference(Identifier("x")),
                Constant(3)
            ),
            VariableReference(Identifier("x")),
            ExpressionStatement(VariableReference(Identifier("x")))
        )
    );
});

parserTest(
    "Parse for statement without post expression",
    "for(a = 0; a > 5;) a * 2;",
    (scanner) => {
        const statement = parseStatement(scanner);
        // TODO: Actually check contents of statement
        // We can't use the standard assert because of
        // undefined member in ForStatement
        assert(statement.kind === "ForStatement");
    }
);

parserTest("Parse for statement with null statement", "for(;;);", (scanner) => {
    const statement = parseStatement(scanner);
    // TODO: Actually check contents of statement
    // We can't use the standard assert because of
    // undefined member in ForStatement
    assert(statement.kind === "ForStatement");
});

parserTest("Parse while statement", "while(1) { int x = 1; }", (scanner) => {
    const statement = parseStatement(scanner);
    matchNode(
        statement,
        WhileStatement(
            Constant(1),
            CompoundStatement([
                VariableDeclaration(
                    Identifier("int"),
                    Identifier("x"),
                    Constant(1)
                )
            ])
        )
    );
});
