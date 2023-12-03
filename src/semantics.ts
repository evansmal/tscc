import {
    FunctionDeclaration,
    FunctionDefinition,
    Identifier,
    Node,
    Parameter,
    Program,
    VariableDeclaration
} from "./parser.js";

export type SymbolTableEntry =
    | FunctionDefinition
    | FunctionDeclaration
    | VariableDeclaration
    | Parameter;

export type SymbolTable = Map<Identifier, SymbolTableEntry>;

export interface UndeclaredIdentifierError {
    kind: "UndeclaredIdentifierError";
    name: Identifier;
}

export interface RedefinitionError {
    kind: "RedefinitionError";
    name: Identifier;
}

export type SemanticError = UndeclaredIdentifierError | RedefinitionError;

interface Scope {
    parent: Scope | null;
    symbols: Map<string, SymbolTableEntry>;
}

export interface SymbolAnalysisResult {
    symbols: SymbolTable;
    errors: SemanticError[];
}

function isNode(x: any): x is Node {
    return typeof x === "object" && typeof x["kind"] === "string";
}

function getChildren(node: Node) {
    const children: Node[] = [];
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) children.push(...value.filter(isNode));
        else if (isNode(value)) children.push(value);
    }
    return children;
}

function findEntry(name: string, scope: Scope): SymbolTableEntry | null {
    const entry = scope.symbols.get(name);
    return entry ? entry : scope.parent ? findEntry(name, scope.parent) : null;
}

// TODO: Implement different name spaces for identifiers (C99 6.2.3)
function bindSymbols(program: Program): SymbolAnalysisResult {
    const symbols: SymbolTable = new Map();
    const errors: SemanticError[] = [];
    let scope: Scope = { symbols: new Map(), parent: null };

    function declareName(name: Identifier, entry: SymbolTableEntry) {
        if (scope.symbols.has(name.value)) {
            errors.push({ kind: "RedefinitionError", name });
        } else {
            scope.symbols.set(name.value, entry);
            symbols.set(name, entry);
        }
    }

    function visitChildren(node: Node) {
        const children = getChildren(node);
        for (const child of children) {
            visitNode(child);
        }
    }

    function visitNode(node: Node) {
        if (node.kind == "Identifier") {
            const entry = findEntry(node.value, scope);
            if (!entry) {
                errors.push({ kind: "UndeclaredIdentifierError", name: node });
            } else if (!symbols.has(node)) {
                symbols.set(node, entry);
            }
            return;
        }

        if (
            node.kind === "FunctionDeclaration" ||
            node.kind === "FunctionDefinition"
        ) {
            declareName(node.name, node);
            const original_scope = scope;
            scope = { symbols: new Map(), parent: original_scope };
            for (const parameter of node.parameters) {
                declareName(parameter.name, parameter);
            }
            if (node.kind === "FunctionDefinition") {
                node.body.body.forEach(visitNode);
            }
            scope = original_scope;
            return;
        }

        if (node.kind === "CompoundStatement") {
            const original_scope = scope;
            scope = { symbols: new Map(), parent: original_scope };
            visitChildren(node);
            scope = original_scope;
            return;
        }

        if (node.kind === "VariableDeclaration") {
            declareName(node.identifier, node);
            visitNode(node.type);
            if (node.value) visitNode(node.value);
            return;
        }

        visitChildren(node);
    }

    visitNode(program);
    return { symbols, errors };
}

function errorToString(error: SemanticError): string {
    if (error.kind === "UndeclaredIdentifierError") {
        return `Error: Use of undeclared identifier '${error.name.value}'`;
    } else {
        return `Error: Redefinition of '${error.name.value}'`;
    }
}

export function analyzeProgram(program: Program): SymbolAnalysisResult {
    const result = bindSymbols(program);
    for (const [id, entry] of result.symbols) {
        console.log(`Entry '${id.value}': ${entry.kind}`);
    }
    for (const error of result.errors) {
        console.error(errorToString(error));
    }
    return result;
}
