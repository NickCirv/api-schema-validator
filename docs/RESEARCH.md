# api-schema-validator — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`710b00eb812ccf2adc2b023aebd7b492348537b5`](https://github.com/NickCirv/api-schema-validator/commit/710b00eb812ccf2adc2b023aebd7b492348537b5).
- Tree: `2b63e7dfdbfde1872c7432fca1d87fbe5567276f`; truncated: `false`.
- Capture: 6 of 6 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/package.json) | Source declaration inspected; runtime unverified |
| Validates JSON documents against its implemented JSON Schema rules and can infer a schema from sample data. | [index.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/index.js) | Implementation interfaces inspected; behavior not executed |
| File, stdin, directory or URL data input; schema validation; sample-based schema generation. | [index.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/index.js) | Source-backed scope, not a test result |
| The implementation is a custom validator; do not assume complete Draft-7 conformance. Inference describes a sample, not every valid business case. URL mode fetches external data. | [index.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Unresolved issues

The implementation is a custom validator; do not assume complete Draft-7 conformance. Inference describes a sample, not every valid business case. URL mode fetches external data.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/LICENSE) | `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d` | 1072 |
| [README.md](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/README.md) | `e8ac43403242bc41ef8f7df985fe365f0a94bc0f88e531561bf9ccaf33de70dc` | 2574 |
| [package.json](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/package.json) | `7eabe4ddba461361f50f75a600bbbf48a9d926b0acfb3e33a3283212bb457a2a` | 837 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/.github/workflows/ci.yml) | `433fbf65635a767ef5cd787147104c248d0cea6bbd6523c6c862f915e0e3206a` | 384 |
| [index.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/index.js) | `803bcdb92b90985f81e9ad659ba70875c18c92960819d2cebd226e635155e534` | 28632 |
| [test/smoke.test.js](https://github.com/NickCirv/api-schema-validator/blob/710b00eb812ccf2adc2b023aebd7b492348537b5/test/smoke.test.js) | `c13952516a0a8afd7d33cc412231929647c8304882bb7816be23f4296b4f62da` | 432 |
