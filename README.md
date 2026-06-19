<div align="center">

# api-schema-validator

**Validate JSON against JSON Schema Draft-7 — pipe from curl, zero dependencies.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?labelColor=0B0A09)](LICENSE)
[![dependencies: zero](https://img.shields.io/badge/dependencies-zero-success?labelColor=0B0A09)](package.json)
[![node: >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?labelColor=0B0A09)](https://nodejs.org)

</div>

## Install

```bash
npx github:NickCirv/api-schema-validator --help
```

No global install required. Works instantly in CI — nothing to `npm install`.

## Usage

```bash
# Validate a local file
jsv --schema schema.json --data response.json

# Pipe from curl
curl -s https://api.example.com/users/1 | jsv --schema user.schema.json

# Validate all .json files in a directory
jsv --schema schema.json --dir tests/fixtures/

# Infer a schema from sample data
jsv --generate sample-response.json > schema.json

# GitHub Actions annotations output
jsv --schema schema.json --data data.json --format github
```

**Example output:**
```
✗ data.json — 3 errors:
  [/user/email] "notanemail" does not match format "email"
  [/user/age] -5 is less than minimum 0
  [/tags/2] expected string, got number
```

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

Exit codes: `0` all valid · `1` validation errors · `2` parse or network error

## What it does

Implements JSON Schema Draft-7 validation in a single `index.js` with no external dependencies — types, string/number/array/object constraints, combinators (`allOf` / `anyOf` / `oneOf` / `not` / `if-then-else`), local `$ref` resolution, and format checks (`email`, `uri`, `date`, `date-time`, `uuid`). Also ships a `--generate` mode that infers a schema from any sample JSON. Both the `api-schema-validator` and short `jsv` aliases are registered as bin commands.

---
<sub>Zero dependencies · Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
