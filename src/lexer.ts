
export type TokenType = "identifier" | "return" | "oparen" | "cparen" | "obrace" | "cbrace" | "obracket" | "cbracket" | "float" | "int" | "semicolon" | "string" | "comment";

export interface Token {
    kind: string
    value: string;
    position: number;
};

function readToken(input: string, position: number): Token | undefined {
    const patterns: [TokenType, RegExp][] = [
        ["return", /^(return)\w*/],
        ["identifier", /^[a-zA-Z_]\w*/],
        ["oparen", /^\(/],
        ["cparen", /^\)/],
        ["float", /^-?\d+\.\d+/],
        ["int", /^-?\d+/],
        ["obrace", /^\{/],
        ["cbrace", /^\}/],
        ["obracket", /^\[/],
        ["cbracket", /^\]/],
        ["semicolon", /^\;/],
        ["string", /^"(\\\\|\\"|[^"])*"/],
        ["comment", /^\/\/.*/],
    ];
    for (let i = 0; i < patterns.length; i++) {
        const [kind, regex] = patterns[i];
        const result = input.slice(position).match(regex);
        if (result !== null) {
            const text = result[0];
            return { kind, value: text, position };
        }
    }
}

export function lex(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < input.length) {
        const token = readToken(input, pos);
        if (token) { tokens.push(token); pos += token.value.length }
        else { pos += 1 }
    }
    return tokens;
}
