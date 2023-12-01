# tscc

##### A toy [C](https://en.wikipedia.org/wiki/C_(programming_language)) compiler written in TypeScript.

![Build](https://github.com/evansmal/tscc/actions/workflows/main.yml/badge.svg)

I created this project to improve my knowledge of compilers and the C programming language. My goal is to keep the source code simple and readable while eventually reaching the point where it can compile non-trivial code. Like many others - I was inspired by the incremental approach from [this](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf) paper by Abdulaziz Ghuloum.

## Getting Started

Start by cloning the repository and installing the dependencies:

```sh
git clone https://github.com/evansmal/tscc.git
cd tscc && yarn install
```

Next, build the project:

```sh
yarn build
```

Run the compiler:

```sh
./tscc main.c
```

Currently, there is support for some subset of C99. The goal is to eventually be able to compile some set of non-trivial real-world applications out there (`libpng`, `git`). 

To get a complete list of all of the language features currently supported, check the integration tests. To name a few:

- Unary and binary operators
- Logical and relational operators
- Local variables
- If statements and conditional expressions
- Compound statements
- Loops (`for`, `while`)

The project is structured as a sequence of passes from the input format (C source code) to the binary output. The final assembling and linking is currently done using `gcc`.

## Unit Testing

Run the unit tests:

```sh
yarn test:unit
```

Run the end-to-end test suite:

```sh
yarn test:feature
```

Adding a new test is as simple as adding a new `.c` file to `test/features`. The test suite will compile and run the test with `tscc` and `gcc` and compare the results.

## References

- [An Incremental Approach to Compiler Construction](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf)

- [chibicc: A Small C Compiler](https://github.com/rui314/chibicc)

- [tcc: Tiny C Compiler](https://bellard.org/tcc)

- [A Review of Assembly Language](http://www.scs.stanford.edu/nyu/04fa/notes/l2.pdf)

- [Writing a C Compiler](https://norasandler.com/2017/11/29/Write-a-Compiler.html)
