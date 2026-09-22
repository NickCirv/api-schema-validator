# api-schema-validator — implementation reference

Source revision: `710b00eb812ccf2adc2b023aebd7b492348537b5`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/package.json) declares `index.js`. Node.js `>=18` and npm.

Executable mapping: `api-schema-validator` → `./index.js`, `jsv` → `./index.js`.

## Supported workflow

File, stdin, directory or URL data input; schema validation; sample-based schema generation.

The implementation is a custom validator; do not assume complete Draft-7 conformance. Inference describes a sample, not every valid business case. URL mode fetches external data.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

| Flag | Description |
|------|-------------|
| `--schema <file>` | JSON Schema file (required for validation) |
| `--data <file>` | JSON file to validate |
| `--url <url>` | Fetch JSON from a URL and validate |
| `--dir <dir>` | Validate all `.json` files in a directory |
| `--generate <file>` | Infer a schema from a sample JSON file |
| `--format table\|json\|github` | Output format (default: `table`) |
| `--coerce` | Coerce strings to numbers/booleans before validating |
| `--bail` | Stop on first error per file |
| `--verbose` | Show passing validations too |
| `-h, --help` | Show help |
| `-v, --version` | Print version |

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Implementation sources

[index.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
