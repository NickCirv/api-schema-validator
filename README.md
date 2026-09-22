![Nicholas Ashkar — api-schema-validator](assets/nicholas-ashkar/banner.png)

# api-schema-validator

Validates JSON documents against its implemented JSON Schema rules and can infer a schema from sample data.






<a id="usage"></a>

<a id="validate-a-local-file"></a>

<a id="pipe-from-curl"></a>

<a id="validate-all-json-files-in-a-directory"></a>

<a id="infer-a-schema-from-sample-data"></a>

## What it does

- File, stdin, directory or URL data input.
- Schema validation.
- Sample-based schema generation.


<a id="install"></a>

## Quickstart

Prerequisites: Node.js `>=18` and npm. The checkout below pins the source used for this documentation.

```sh
git clone https://github.com/NickCirv/api-schema-validator.git
cd api-schema-validator
git checkout 710b00eb812ccf2adc2b023aebd7b492348537b5
node index.js --generate package.json
```

**Expected behavior (illustrative, not captured):** Prints an inferred schema for this repository manifest.

Examples are source-inspected, **not runtime-tested**. See the research record for verification gaps.


<a id="github-actions-annotations-output"></a>

## Boundaries and data

The implementation is a custom validator; do not assume complete Draft-7 conformance. Inference describes a sample, not every valid business case. URL mode fetches external data.

## Development

The manifest defines `npm test` as:

```sh
node --test
```

The captured suite is a smoke check, not end-to-end behavior coverage. Examples include “entry is valid JavaScript”, “--help exits 0”. Tests were not run for this documentation revision.

See [implementation and command reference](docs/REFERENCE.md) for the package scripts and inspected interfaces, and [research record](docs/RESEARCH.md) for the pinned source, document decisions and unresolved checks.

## License and contact

See [LICENSE](LICENSE) for the original terms and attribution. Legal text is unchanged.

[Nicholas Ashkar](https://nicholashkar.com/) · [Discuss a project](https://nicholashkar.com/#oxblood-contact)
