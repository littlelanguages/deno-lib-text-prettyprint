# deno-lib-text-prettyprint

A crude implementation of Haskell's [Pretty Print](https://hackage.haskell.org/package/pretty-1.1.3.6/docs/Text-PrettyPrint.html) library.

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/main/mod.ts)

## Building Source

The directory `~/.devcontainer` contains a Dockerfile used by [Visual Studio Code](https://code.visualstudio.com) to issolate the editor and build tools from being installed on the developer's workstation.

The Dockerfile is straightforward with the interesting piece being [entr](https://github.com/eradman/entr/) which is used by the `etl.sh` to run `test.sh` whenever a source file has changed.

## Scripts

Three script can be found inside `~/.bin`

| Name   | Purpose |
|--------|----------------------------------|
| etl.sh | Runs an edit-test-loop - loops indefinately running all of the tests whenever a source file has changed. |
| test.sh | Runs lint on the source code and executes the automated tests. |
| test_debug.sh | Runs lint on the source code and executes the automated tests with the options `--inspect-brk -A` allowing a debugger to be attached to the process. |

These scripts must be run out of the project's root directory which, when using [Visual Studio Code](https://code.visualstudio.com), is done using a shell inside the container.