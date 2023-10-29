import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function bright(text: string) {
    return `\x1b[1m${text}\x1b[0m`;
}

function green(text: string) {
    return `\x1b[32m${text}\x1b[0m`;
}

function red(text: string) {
    return `\x1b[31m${text}\x1b[0m`;
}

function compile(cc: string, input: string, output: string) {
    const command = `${cc} ${input} -o ${output}`;
    const res = spawnSync(command, { shell: true });
    if (res.error || res.status !== 0) {
        throw new Error(`Compilation failed for "${command}"`);
    }
    return output;
}

function execute(filepath: string) {
    const out = spawnSync(filepath);
    if (out.error) {
        throw new Error(`Error while running "${filepath}"`);
    }
    return out.status;
}

function runTestCase(directory: string, input_filename: string): boolean {
    const input_filepath = join(directory, input_filename);
    const actual = compile(
        "gcc",
        input_filepath,
        `/tmp/${input_filename}.gcc.out`
    );
    let pred;
    try {
        pred = compile(
            "./tscc",
            input_filepath,
            `/tmp/${input_filename}.tscc.out`
        );
    } catch {
        return false;
    }
    return execute(actual) == execute(pred);
}

function failsToCompile(directory: string, input_filename: string): boolean {
    const input_filepath = join(directory, input_filename);
    try {
        compile("./tscc", input_filepath, `/tmp/${input_filename}.tscc.out`);
    } catch {
        return true;
    }
    return false;
}

interface TestCase {
    name: string;
}

interface TestSuite {
    directory: string;
    tests: TestCase[];
}

function loadTestSuite(directory: string): TestSuite {
    const tests: TestCase[] = readdirSync(directory).map((file) => {
        return { name: file };
    });
    return {
        directory,
        tests
    };
}

function main() {
    let any_failed = false;

    const test_suite =
        process.argv.length > 2
            ? {
                  directory: "test/features",
                  tests: process.argv.slice(2).map((file) => {
                      return { name: file };
                  })
              }
            : loadTestSuite("test/features");

    for (let i = 0; i < test_suite.tests.length; i++) {
        const name = test_suite.tests[i].name;
        const passed = name.startsWith("error")
            ? failsToCompile(test_suite.directory, name)
            : runTestCase(test_suite.directory, name);
        if (!passed) {
            any_failed = true;
        }
        const result = bright(passed ? green("[PASS]") : red("[FAIL]"));
        console.log(
            `${result} Test ${i + 1}/${test_suite.tests.length}: ${
                test_suite.tests[i].name
            }`
        );
    }
    process.exit(any_failed ? 1 : 0);
}

main();
