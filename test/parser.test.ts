import { parserTest, matchNode } from "./common.test.js";

import {
    parseExternalDeclarations,
    FunctionDefinition,
    FunctionDeclaration,
    Parameter,
    CompoundStatement,
    Return,
    Identifier,
    VariableReference
} from "../src/parser.js";

parserTest(
    `Parse function declaration`,
    `int test(int x, int y, int z);`,
    (scanner) => {
        const declaration = parseExternalDeclarations(scanner);
        matchNode(
            declaration,
            FunctionDeclaration(Identifier("test"), [
                Parameter(Identifier("int"), Identifier("x")),
                Parameter(Identifier("int"), Identifier("y")),
                Parameter(Identifier("int"), Identifier("z"))
            ])
        );
    }
);

parserTest(
    `Parse function declaration without parameters`,
    `int a();`,
    (scanner) => {
        const declaration = parseExternalDeclarations(scanner);
        matchNode(declaration, FunctionDeclaration(Identifier("a"), []));
    }
);

parserTest(
    `Parse function definition`,
    `int abc(int hello, int world) { return hello; }`,
    (scanner) => {
        const definition = parseExternalDeclarations(scanner);
        matchNode(
            definition,
            FunctionDefinition(
                Identifier("abc"),
                [
                    Parameter(Identifier("int"), Identifier("hello")),
                    Parameter(Identifier("int"), Identifier("world"))
                ],
                CompoundStatement([
                    Return(VariableReference(Identifier("hello")))
                ])
            )
        );
    }
);
