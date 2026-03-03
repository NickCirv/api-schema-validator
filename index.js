#!/usr/bin/env node
/**
 * api-schema-validator — JSON Schema Draft-7 CLI validator
 * Zero dependencies. Pure Node.js ES modules.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import readline from 'readline';
import { fileURLToPath } from 'url';

// ─── Exit codes ───────────────────────────────────────────────────────────────
const EXIT_VALID   = 0;
const EXIT_INVALID = 1;
const EXIT_ERROR   = 2;

// ─── Format validators (regex-based, no deps) ─────────────────────────────────
const FORMATS = {
  email:     /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uri:       /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^\s]*$/,
  date:      /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
  'date-time': /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-][01]\d:[0-5]\d)$/,
  uuid:      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// ─── Type checking helpers ─────────────────────────────────────────────────────
const typeOf = (v) => {
  if (v === null)           return 'null';
  if (Array.isArray(v))     return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
};

const matchesType = (v, t) => {
  const actual = typeOf(v);
  if (t === 'number')  return actual === 'number' || actual === 'integer';
  if (t === 'integer') return actual === 'integer';
  return actual === t;
};

// ─── $ref resolution (local within same schema) ───────────────────────────────
const resolveRef = (ref, rootSchema) => {
  if (!ref.startsWith('#')) {
    throw new Error(`External $ref not supported: ${ref}`);
  }
  const parts = ref.slice(2).split('/').filter(Boolean);
  let node = rootSchema;
  for (const part of parts) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || typeof node !== 'object' || !(key in node)) {
      throw new Error(`Cannot resolve $ref: ${ref}`);
    }
    node = node[key];
  }
  return node;
};

// ─── Core validator ───────────────────────────────────────────────────────────
/**
 * Validate `data` against `schema`.
 * @param {*}      data       - value to validate
 * @param {object} schema     - JSON Schema (Draft-7)
 * @param {object} rootSchema - top-level schema (for $ref resolution)
 * @param {string} path       - JSON Pointer path for error messages
 * @param {object} opts       - { bail, coerce }
 * @returns {string[]}        - array of human-readable error messages
 */
const validate = (data, schema, rootSchema, path = '', opts = {}) => {
  // Boolean schemas
  if (schema === true)  return [];
  if (schema === false) return [`[${path || '/'}] schema disallows all values`];
  if (typeof schema !== 'object' || schema === null) return [];

  // $ref — resolve and validate, ignore sibling keywords
  if ('$ref' in schema) {
    const resolved = resolveRef(schema.$ref, rootSchema);
    return validate(data, resolved, rootSchema, path, opts);
  }

  const errors = [];
  const bail   = opts.bail ?? false;

  const push = (msg) => { errors.push(msg); return bail; };

  // ── Coerce ────────────────────────────────────────────────────────────────
  if (opts.coerce && typeof data === 'string') {
    const types = [].concat(schema.type || []);
    if (types.includes('number') || types.includes('integer')) {
      const n = Number(data);
      if (!isNaN(n)) data = n;
    } else if (types.includes('boolean')) {
      if (data === 'true')  data = true;
      if (data === 'false') data = false;
    }
  }

  // ── type ──────────────────────────────────────────────────────────────────
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some(t => matchesType(data, t))) {
      const got = typeOf(data);
      if (push(`[${path || '/'}] expected ${types.join(' | ')}, got ${got}`)) return errors;
    }
  }

  // ── enum ──────────────────────────────────────────────────────────────────
  if (schema.enum !== undefined) {
    const match = schema.enum.some(v => deepEqual(v, data));
    if (!match) {
      if (push(`[${path || '/'}] value must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`)) return errors;
    }
  }

  // ── const ─────────────────────────────────────────────────────────────────
  if ('const' in schema) {
    if (!deepEqual(schema.const, data)) {
      if (push(`[${path || '/'}] value must be ${JSON.stringify(schema.const)}`)) return errors;
    }
  }

  // ── String keywords ───────────────────────────────────────────────────────
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      if (push(`[${path || '/'}] string length ${data.length} is less than minLength ${schema.minLength}`)) return errors;
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      if (push(`[${path || '/'}] string length ${data.length} exceeds maxLength ${schema.maxLength}`)) return errors;
    }
    if (schema.pattern !== undefined) {
      const re = new RegExp(schema.pattern);
      if (!re.test(data)) {
        if (push(`[${path || '/'}] ${JSON.stringify(data)} does not match pattern "${schema.pattern}"`)) return errors;
      }
    }
    if (schema.format !== undefined) {
      const re = FORMATS[schema.format];
      if (re && !re.test(data)) {
        if (push(`[${path || '/'}] ${JSON.stringify(data)} does not match format "${schema.format}"`)) return errors;
      }
    }
  }

  // ── Number keywords ───────────────────────────────────────────────────────
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      if (push(`[${path || '/'}] ${data} is less than minimum ${schema.minimum}`)) return errors;
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      if (push(`[${path || '/'}] ${data} exceeds maximum ${schema.maximum}`)) return errors;
    }
    if (schema.exclusiveMinimum !== undefined) {
      if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) {
        if (push(`[${path || '/'}] ${data} must be greater than ${schema.exclusiveMinimum}`)) return errors;
      } else if (schema.exclusiveMinimum === true && schema.minimum !== undefined && data <= schema.minimum) {
        if (push(`[${path || '/'}] ${data} must be greater than ${schema.minimum}`)) return errors;
      }
    }
    if (schema.exclusiveMaximum !== undefined) {
      if (typeof schema.exclusiveMaximum === 'number' && data >= schema.exclusiveMaximum) {
        if (push(`[${path || '/'}] ${data} must be less than ${schema.exclusiveMaximum}`)) return errors;
      } else if (schema.exclusiveMaximum === true && schema.maximum !== undefined && data >= schema.maximum) {
        if (push(`[${path || '/'}] ${data} must be less than ${schema.maximum}`)) return errors;
      }
    }
    if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0) {
      if (push(`[${path || '/'}] ${data} is not a multiple of ${schema.multipleOf}`)) return errors;
    }
  }

  // ── Array keywords ────────────────────────────────────────────────────────
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      if (push(`[${path || '/'}] array has ${data.length} items, minimum is ${schema.minItems}`)) return errors;
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      if (push(`[${path || '/'}] array has ${data.length} items, maximum is ${schema.maxItems}`)) return errors;
    }
    if (schema.uniqueItems) {
      const seen = [];
      for (let i = 0; i < data.length; i++) {
        if (seen.some(s => deepEqual(s, data[i]))) {
          if (push(`[${path || '/'}/${i}] duplicate item (uniqueItems violation)`)) return errors;
        }
        seen.push(data[i]);
      }
    }
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        // Tuple validation
        for (let i = 0; i < schema.items.length; i++) {
          if (i < data.length) {
            const sub = validate(data[i], schema.items[i], rootSchema, `${path}/${i}`, opts);
            errors.push(...sub);
            if (bail && errors.length) return errors;
          }
        }
        // additionalItems
        if (schema.additionalItems === false && data.length > schema.items.length) {
          if (push(`[${path || '/'}] array has ${data.length} items but schema allows only ${schema.items.length}`)) return errors;
        } else if (schema.additionalItems && typeof schema.additionalItems === 'object') {
          for (let i = schema.items.length; i < data.length; i++) {
            const sub = validate(data[i], schema.additionalItems, rootSchema, `${path}/${i}`, opts);
            errors.push(...sub);
            if (bail && errors.length) return errors;
          }
        }
      } else {
        for (let i = 0; i < data.length; i++) {
          const sub = validate(data[i], schema.items, rootSchema, `${path}/${i}`, opts);
          errors.push(...sub);
          if (bail && errors.length) return errors;
        }
      }
    }
    if (schema.contains !== undefined) {
      const found = data.some(item => validate(item, schema.contains, rootSchema, '', opts).length === 0);
      if (!found) {
        if (push(`[${path || '/'}] no array item matches "contains" schema`)) return errors;
      }
    }
  }

  // ── Object keywords ───────────────────────────────────────────────────────
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);

    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      if (push(`[${path || '/'}] object has ${keys.length} properties, minimum is ${schema.minProperties}`)) return errors;
    }
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      if (push(`[${path || '/'}] object has ${keys.length} properties, maximum is ${schema.maxProperties}`)) return errors;
    }
    if (schema.required !== undefined) {
      for (const req of schema.required) {
        if (!(req in data)) {
          if (push(`[${path || '/'}] missing required property "${req}"`)) return errors;
        }
      }
    }

    // Track which keys are covered by properties/patternProperties
    const coveredByPattern = new Set();

    if (schema.patternProperties !== undefined) {
      for (const [pattern, subSchema] of Object.entries(schema.patternProperties)) {
        const re = new RegExp(pattern);
        for (const key of keys) {
          if (re.test(key)) {
            coveredByPattern.add(key);
            const sub = validate(data[key], subSchema, rootSchema, `${path}/${key}`, opts);
            errors.push(...sub);
            if (bail && errors.length) return errors;
          }
        }
      }
    }

    if (schema.properties !== undefined) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const sub = validate(data[key], subSchema, rootSchema, `${path}/${key}`, opts);
          errors.push(...sub);
          if (bail && errors.length) return errors;
        }
      }
    }

    if (schema.additionalProperties !== undefined) {
      const defined = new Set(Object.keys(schema.properties || {}));
      for (const key of keys) {
        if (!defined.has(key) && !coveredByPattern.has(key)) {
          if (schema.additionalProperties === false) {
            if (push(`[${path || '/'}] additional property "${key}" is not allowed`)) return errors;
          } else if (typeof schema.additionalProperties === 'object') {
            const sub = validate(data[key], schema.additionalProperties, rootSchema, `${path}/${key}`, opts);
            errors.push(...sub);
            if (bail && errors.length) return errors;
          }
        }
      }
    }
  }

  // ── Combinators ───────────────────────────────────────────────────────────
  if (schema.allOf !== undefined) {
    for (let i = 0; i < schema.allOf.length; i++) {
      const sub = validate(data, schema.allOf[i], rootSchema, path, opts);
      errors.push(...sub);
      if (bail && errors.length) return errors;
    }
  }

  if (schema.anyOf !== undefined) {
    const anyPasses = schema.anyOf.some(s => validate(data, s, rootSchema, path, opts).length === 0);
    if (!anyPasses) {
      if (push(`[${path || '/'}] value does not match any of the schemas in "anyOf"`)) return errors;
    }
  }

  if (schema.oneOf !== undefined) {
    const passing = schema.oneOf.filter(s => validate(data, s, rootSchema, path, opts).length === 0);
    if (passing.length !== 1) {
      if (push(`[${path || '/'}] value must match exactly one schema in "oneOf" (matched ${passing.length})`)) return errors;
    }
  }

  if (schema.not !== undefined) {
    const sub = validate(data, schema.not, rootSchema, path, opts);
    if (sub.length === 0) {
      if (push(`[${path || '/'}] value must NOT match the "not" schema`)) return errors;
    }
  }

  if (schema.if !== undefined) {
    const ifErrors = validate(data, schema.if, rootSchema, path, opts);
    if (ifErrors.length === 0 && schema.then !== undefined) {
      const sub = validate(data, schema.then, rootSchema, path, opts);
      errors.push(...sub);
    } else if (ifErrors.length > 0 && schema.else !== undefined) {
      const sub = validate(data, schema.else, rootSchema, path, opts);
      errors.push(...sub);
    }
    if (bail && errors.length) return errors;
  }

  return errors;
};

// ─── Deep equality (for enum/const/uniqueItems) ───────────────────────────────
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (!deepEqual(ka, kb)) return false;
    return ka.every(k => deepEqual(a[k], b[k]));
  }
  return false;
};

// ─── Schema inference from sample data ────────────────────────────────────────
const inferSchema = (data) => {
  const t = typeOf(data);
  if (data === null)       return { type: 'null' };
  if (t === 'boolean')     return { type: 'boolean' };
  if (t === 'integer')     return { type: 'integer', examples: [data] };
  if (t === 'number')      return { type: 'number',  examples: [data] };
  if (t === 'string') {
    const schema = { type: 'string' };
    // Detect format hints
    if (FORMATS.email.test(data))       schema.format = 'email';
    else if (FORMATS.uuid.test(data))   schema.format = 'uuid';
    else if (FORMATS['date-time'].test(data)) schema.format = 'date-time';
    else if (FORMATS.date.test(data))   schema.format = 'date';
    else if (FORMATS.uri.test(data))    schema.format = 'uri';
    return schema;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array' };
    const itemSchemas = data.map(inferSchema);
    // Merge if all same type
    const types = [...new Set(itemSchemas.map(s => s.type))];
    const items = types.length === 1 ? itemSchemas[0] : { oneOf: itemSchemas };
    return { type: 'array', items, minItems: data.length, maxItems: data.length };
  }
  if (t === 'object') {
    const props = {};
    for (const [k, v] of Object.entries(data)) {
      props[k] = inferSchema(v);
    }
    return {
      type: 'object',
      properties: props,
      required: Object.keys(data),
    };
  }
  return {};
};

// ─── HTTP fetch (no external deps) ────────────────────────────────────────────
const fetchUrl = (url) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, { timeout: 15000 }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchUrl(res.headers.location).then(resolve).catch(reject);
    }
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  req.on('error', reject);
});

// ─── stdin reader ─────────────────────────────────────────────────────────────
const readStdin = () => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  let data = '';
  rl.on('line', line => { data += line + '\n'; });
  rl.on('close', () => resolve(data.trim()));
});

// ─── Output formatters ────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

const isTTY = process.stdout.isTTY;
const c = (str, code) => isTTY ? `${code}${str}${RESET}` : str;

const formatResult = (label, errors, format, verbose, passing) => {
  if (format === 'json') return null; // handled at the end

  const ok  = errors.length === 0;
  const sym  = ok ? c('✓', GREEN) : c('✗', RED);
  const head = `${sym} ${c(label, BOLD)}`;

  if (format === 'github') {
    if (!ok) {
      for (const e of errors) {
        console.log(`::error title=Validation Error::${label} ${e}`);
      }
    }
    return;
  }

  // table / default
  if (ok) {
    if (verbose || passing) {
      console.log(`${head} ${c('— valid', DIM)}`);
    }
  } else {
    console.log(`${head} ${c(`— ${errors.length} error${errors.length > 1 ? 's' : ''}:`, RED)}`);
    for (const e of errors) {
      console.log(`  ${c(e, YELLOW)}`);
    }
  }
};

// ─── Argument parser ──────────────────────────────────────────────────────────
const parseArgs = (argv) => {
  const args = argv.slice(2);
  const opts = {
    schema:  null,
    data:    null,
    url:     null,
    dir:     null,
    format:  'table',
    coerce:  false,
    bail:    false,
    verbose: false,
    generate: null,
    help:    false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--schema':   opts.schema   = args[++i]; break;
      case '--data':     opts.data     = args[++i]; break;
      case '--url':      opts.url      = args[++i]; break;
      case '--dir':      opts.dir      = args[++i]; break;
      case '--format':   opts.format   = args[++i]; break;
      case '--generate': opts.generate = args[++i]; break;
      case '--coerce':   opts.coerce   = true;       break;
      case '--bail':     opts.bail     = true;       break;
      case '--verbose':  opts.verbose  = true;       break;
      case '--help':
      case '-h':         opts.help     = true;       break;
      case '--version':
      case '-v':         opts.version  = true;       break;
      default:
        if (!a.startsWith('--')) {
          // positional: treat as --data if schema already set
          if (opts.schema && !opts.data) opts.data = a;
          else if (!opts.schema) opts.schema = a;
        }
    }
  }
  return opts;
};

const HELP = `
${c('api-schema-validator', BOLD)} — JSON Schema Draft-7 CLI validator
Zero dependencies · Node 18+ · MIT License

${c('USAGE', BOLD)}
  jsv --schema <schema.json> --data <data.json>
  echo '{"name":"Nick"}' | jsv --schema <schema.json>
  jsv --schema <schema.json> --url <http://api/endpoint>
  jsv --schema <schema.json> --dir <fixtures/>
  jsv --generate <sample.json>

${c('OPTIONS', BOLD)}
  --schema <file>       JSON Schema file (required for validation)
  --data <file>         JSON file to validate
  --url <url>           Fetch JSON from URL and validate
  --dir <dir>           Validate all .json files in directory
  --generate <file>     Infer a schema from a sample JSON file
  --format <fmt>        Output format: table (default), json, github
  --coerce              Coerce strings to numbers/booleans before validating
  --bail                Stop on first error per file
  --verbose             Show passing validations too
  -h, --help            Show this help
  -v, --version         Print version

${c('EXIT CODES', BOLD)}
  0   All valid
  1   Validation errors found
  2   Parse or network error

${c('EXAMPLES', BOLD)}
  # Validate a file
  jsv --schema schema.json --data response.json

  # Pipe from curl
  curl -s https://api.example.com/user | jsv --schema user.schema.json

  # Validate all fixtures
  jsv --schema schema.json --dir tests/fixtures/

  # Infer schema from sample
  jsv --generate sample.json > schema.json

  # CI-friendly GitHub Actions output
  jsv --schema schema.json --data data.json --format github

  # Strict: no extra properties, stop on first error
  jsv --schema schema.json --data data.json --bail
`.trim();

// ─── Main ─────────────────────────────────────────────────────────────────────
const main = async () => {
  const opts = parseArgs(process.argv);

  if (opts.version) {
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg   = JSON.parse(fs.readFileSync(path.join(__dir, 'package.json'), 'utf8'));
    console.log(pkg.version);
    process.exit(EXIT_VALID);
  }

  if (opts.help) {
    console.log(HELP);
    process.exit(EXIT_VALID);
  }

  // ── Generate mode ────────────────────────────────────────────────────────
  if (opts.generate) {
    let raw;
    try { raw = fs.readFileSync(opts.generate, 'utf8'); }
    catch (e) { console.error(`Error reading ${opts.generate}: ${e.message}`); process.exit(EXIT_ERROR); }
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { console.error(`JSON parse error in ${opts.generate}: ${e.message}`); process.exit(EXIT_ERROR); }
    const schema = inferSchema(data);
    schema.$schema = 'http://json-schema.org/draft-07/schema#';
    console.log(JSON.stringify(schema, null, 2));
    process.exit(EXIT_VALID);
  }

  // ── Validation mode — schema is required ─────────────────────────────────
  if (!opts.schema) {
    console.error('Error: --schema is required\n\nRun jsv --help for usage.');
    process.exit(EXIT_ERROR);
  }

  let schemaData;
  try {
    const schemaRaw = fs.readFileSync(opts.schema, 'utf8');
    schemaData = JSON.parse(schemaRaw);
  } catch (e) {
    console.error(`Error loading schema "${opts.schema}": ${e.message}`);
    process.exit(EXIT_ERROR);
  }

  // Collect (label, jsonText) pairs to validate
  const items = [];

  if (opts.url) {
    // URL mode
    let resp;
    try { resp = await fetchUrl(opts.url); }
    catch (e) { console.error(`Network error fetching ${opts.url}: ${e.message}`); process.exit(EXIT_ERROR); }
    if (resp.status >= 400) {
      console.error(`HTTP ${resp.status} from ${opts.url}`);
      process.exit(EXIT_ERROR);
    }
    items.push({ label: opts.url, text: resp.body });
  } else if (opts.dir) {
    // Directory mode
    let entries;
    try { entries = fs.readdirSync(opts.dir); }
    catch (e) { console.error(`Cannot read directory "${opts.dir}": ${e.message}`); process.exit(EXIT_ERROR); }
    const jsonFiles = entries.filter(f => f.endsWith('.json')).sort();
    if (jsonFiles.length === 0) {
      console.error(`No .json files found in "${opts.dir}"`);
      process.exit(EXIT_ERROR);
    }
    for (const f of jsonFiles) {
      const fpath = path.join(opts.dir, f);
      let text;
      try { text = fs.readFileSync(fpath, 'utf8'); }
      catch (e) { console.error(`Cannot read ${fpath}: ${e.message}`); process.exit(EXIT_ERROR); }
      items.push({ label: fpath, text });
    }
  } else if (opts.data) {
    // File mode
    let text;
    try { text = fs.readFileSync(opts.data, 'utf8'); }
    catch (e) { console.error(`Cannot read "${opts.data}": ${e.message}`); process.exit(EXIT_ERROR); }
    items.push({ label: opts.data, text });
  } else {
    // Stdin mode — only if stdin is piped
    if (process.stdin.isTTY) {
      console.error('No data source provided. Use --data, --url, --dir, or pipe via stdin.\n\nRun jsv --help for usage.');
      process.exit(EXIT_ERROR);
    }
    const text = await readStdin();
    items.push({ label: '<stdin>', text });
  }

  // ── Validate all items ────────────────────────────────────────────────────
  const results = [];
  let anyErrors = false;

  for (const { label, text } of items) {
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      console.error(`JSON parse error in ${label}: ${e.message}`);
      process.exit(EXIT_ERROR);
    }

    const errors = validate(data, schemaData, schemaData, '', { bail: opts.bail, coerce: opts.coerce });
    const ok = errors.length === 0;
    if (!ok) anyErrors = true;

    results.push({ label, errors, ok });

    if (opts.format !== 'json') {
      formatResult(label, errors, opts.format, opts.verbose, true);
    }
  }

  // ── JSON format: emit all at once ─────────────────────────────────────────
  if (opts.format === 'json') {
    const output = results.map(({ label, errors, ok }) => ({ file: label, valid: ok, errors }));
    console.log(JSON.stringify(output.length === 1 ? output[0] : output, null, 2));
  }

  // ── Summary for multiple files ────────────────────────────────────────────
  if (results.length > 1 && opts.format !== 'json' && opts.format !== 'github') {
    const pass = results.filter(r => r.ok).length;
    const fail = results.length - pass;
    const summary = fail > 0
      ? c(`\n${pass}/${results.length} valid, ${fail} failed`, RED)
      : c(`\n${pass}/${results.length} valid`, GREEN);
    console.log(summary);
  }

  process.exit(anyErrors ? EXIT_INVALID : EXIT_VALID);
};

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(EXIT_ERROR);
});
