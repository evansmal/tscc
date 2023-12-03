import assert from "node:assert";
import { semanticTest } from "./common.test.js";

semanticTest(
    "Parameters are declared in function scope",
    `int f(int x) { int x; }`,
    (ast, { symbols, errors }) => {
        const f = ast.declarations[0];
        const x = f.parameters[0];
        assert(symbols.get(f.name) === f);
        assert(symbols.get(x.name) === x);
        assert(symbols.size === 2);

        const redefinition = errors.find((e) => e.kind === "RedefinitionError");
        assert(redefinition);
        assert(redefinition.kind === "RedefinitionError");
        assert(redefinition.name.value === "x");
        assert(redefinition.name !== x.name);
    }
);

semanticTest(
    "Inner scope shadows outer scope",
    `int x(int x) { }`,
    (ast, { symbols, errors }) => {
        const x_fun = ast.declarations[0];
        const x_param = x_fun.parameters[0];
        assert(x_fun.name.value === "x");
        assert(x_param.name.value === "x");
        assert(symbols.get(x_fun.name) === x_fun);
        assert(symbols.get(x_param.name) === x_param);
        assert(symbols.size === 2);
    }
);

semanticTest(
    "Detects use of undeclared identifiers",
    `int main() { x; }`,
    (ast, { symbols, errors }) => {
        const undeclared = errors.find(
            (e) =>
                e.kind === "UndeclaredIdentifierError" && e.name.value === "x"
        );
        assert(undeclared);
        assert(symbols.size === 1);
    }
);
