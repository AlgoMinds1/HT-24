import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robustly resolve path to contracts/verdict.schema.json
function resolveSchemaPath() {
  const candidatePaths = [
    path.resolve(__dirname, '../../../contracts/verdict.schema.json'),
    path.resolve(__dirname, '../../contracts/verdict.schema.json'),
    path.resolve(process.cwd(), 'contracts/verdict.schema.json'),
    path.resolve(process.cwd(), '../contracts/verdict.schema.json')
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate contracts/verdict.schema.json. Please verify repository structure.');
}

let ajvInstance = null;
let validateVerdictFn = null;

/**
 * Initializes and compiles Ajv validator singleton.
 */
function getValidator() {
  if (validateVerdictFn) return validateVerdictFn;

  const schemaPath = resolveSchemaPath();
  const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  ajvInstance = new Ajv({
    allErrors: true,
    strict: false
  });
  const addFormatsFn = typeof addFormats === 'function' ? addFormats : (addFormats && addFormats.default ? addFormats.default : null);
  if (typeof addFormatsFn === 'function') {
    addFormatsFn(ajvInstance);
  }

  validateVerdictFn = ajvInstance.compile(schemaContent);
  return validateVerdictFn;
}

/**
 * Validates a candidate verdict payload against contracts/verdict.schema.json.
 * 
 * @param {Object} payload
 * @returns {{ valid: boolean, errors: Array|null }}
 */
export function validateVerdictPayload(payload) {
  const validator = getValidator();
  const valid = validator(payload);

  if (valid) {
    return { valid: true, errors: null };
  }

  return {
    valid: false,
    errors: validator.errors.map(err => ({
      instancePath: err.instancePath,
      schemaPath: err.schemaPath,
      keyword: err.keyword,
      message: err.message,
      params: err.params
    }))
  };
}
