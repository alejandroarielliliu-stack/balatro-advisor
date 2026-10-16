/** Structural validation only. No Balatro effects, defaults or compatibility rules. */
export interface Issue { path: string; code: string; message: string }
export type Result<T> = { ok: true; value: T } | { ok: false; errors: Issue[] };
export interface Schema<T> {
  check(value: unknown, path: string, issues: Issue[]): boolean;
  readonly type?: T;
}
export type Infer<S> = S extends Schema<infer T> ? T : never;
type Shape = Record<string, Schema<unknown>>;
type RequiredFields<S extends Shape> = { -readonly [K in keyof S]: Infer<S[K]> };
type OptionalFields<S extends Shape> = { -readonly [K in keyof S]?: Infer<S[K]> };

export function issue(issues: Issue[], path: string, code: string, message: string): false {
  issues.push({ path, code, message });
  return false;
}
export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function text(max = 200): Schema<string> {
  return { check: (value, path, errors) =>
    (typeof value === 'string' && value.trim().length > 0 && value.length <= max)
    || issue(errors, path, 'string', `Se requiere texto no vacío de hasta ${max} caracteres.`) };
}
export function integer(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Schema<number> {
  return { check: (value, path, errors) =>
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max)
    || issue(errors, path, 'integer', `Se requiere un entero seguro entre ${min} y ${max}.`) };
}
export const boolean: Schema<boolean> = {
  check: (value, path, errors) => typeof value === 'boolean'
    || issue(errors, path, 'boolean', 'Se requiere true o false; no se convierten cadenas.')
};
export function enumeration<const T extends readonly string[]>(...choices: T): Schema<T[number]> {
  return { check: (value, path, errors) =>
    (typeof value === 'string' && choices.includes(value))
    || issue(errors, path, 'enum', `Valor permitido: ${choices.join(', ')}.`) };
}
export function array<T>(item: Schema<T>, max = 1000): Schema<T[]> {
  return { check(value, path, errors) {
    if (!Array.isArray(value)) return issue(errors, path, 'array', 'Se requiere una lista.');
    if (value.length > max) return issue(errors, path, 'size', `La lista supera el límite técnico de ${max}.`);
    let valid = true;
    value.forEach((entry, index) => { if (!item.check(entry, `${path}[${index}]`, errors)) valid = false; });
    return valid;
  } };
}
export function object<const R extends Shape, const O extends Shape = Record<never, never>>(
  required: R, optional = {} as O
): Schema<RequiredFields<R> & OptionalFields<O>> {
  return { check(value, path, errors) {
    if (!isObject(value)) return issue(errors, path, 'object', 'Se requiere un objeto.');
    let valid = true;
    for (const [key, schema] of Object.entries(required)) {
      if (!Object.hasOwn(value, key)) {
        issue(errors, `${path}.${key}`, 'required', 'Falta este campo; usa status: unknown si no lo conoces.');
        valid = false;
      } else if (!schema.check(value[key], `${path}.${key}`, errors)) valid = false;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (Object.hasOwn(required, key)) continue;
      const schema = Object.hasOwn(optional, key) ? optional[key] : undefined;
      if (!schema) {
        issue(errors, `${path}.${key}`, 'unexpected_field', 'Campo no reconocido; no se descartará silenciosamente.');
        valid = false;
      } else if (!schema.check(entry, `${path}.${key}`, errors)) valid = false;
    }
    return valid;
  } };
}
export function record<T>(entrySchema: Schema<T>): Schema<Record<string, T>> {
  return { check(value, path, errors) {
    if (!isObject(value)) return issue(errors, path, 'object', 'Se requiere un mapa de valores.');
    let valid = true;
    for (const [key, entry] of Object.entries(value)) {
      if (!text().check(key, path, errors)) valid = false;
      if (!entrySchema.check(entry, `${path}.${key}`, errors)) valid = false;
    }
    return valid;
  } };
}
export function union<A, B>(a: Schema<A>, b: Schema<B>): Schema<A | B> {
  return { check(value, path, errors) {
    const first: Issue[] = [], second: Issue[] = [];
    if (a.check(value, path, first) || b.check(value, path, second)) return true;
    errors.push(...(first.length <= second.length ? first : second));
    return false;
  } };
}
export type Fact<T> =
  | { status: 'known'; value: T; source: 'manual' | 'confirmedPreset' }
  | { status: 'unknown'; reason: string };
export function fact<T>(schema: Schema<T>): Schema<Fact<T>> {
  const known = object({ status: enumeration('known'), value: schema, source: enumeration('manual', 'confirmedPreset') });
  const unknown = object({ status: enumeration('unknown'), reason: text(1000) });
  return { check(value, path, errors) {
    if (!isObject(value) || (value.status !== 'known' && value.status !== 'unknown')) {
      return issue(errors, `${path}.status`, 'fact_status', 'Indica known con value/source o unknown con reason.');
    }
    return (value.status === 'known' ? known : unknown).check(value, path, errors);
  } };
}

/** Reject values JSON would silently lose/change, getters, cycles and excessive depth. */
export function checkJsonValue(value: unknown): Issue[] {
  const errors: Issue[] = [], ancestors = new Set<object>();
  let visited = 0;
  function walk(entry: unknown, path: string, depth: number): void {
    if (++visited > 100_000 || depth > 60) {
      issue(errors, path, 'complexity', 'El documento supera el límite técnico de tamaño o profundidad.');
      return;
    }
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') return;
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      if (Object.is(entry, -0)) issue(errors, path, 'json_value', 'Usa 0 en lugar de -0 para evitar pérdida al serializar.');
      return;
    }
    if (typeof entry !== 'object') { issue(errors, path, 'json_value', 'Valor no representable en JSON sin pérdida.'); return; }
    const proto: unknown = Object.getPrototypeOf(entry);
    if (!Array.isArray(entry) && proto !== Object.prototype && proto !== null) {
      issue(errors, path, 'json_object', 'Usa objetos JSON simples.'); return;
    }
    if (ancestors.has(entry)) { issue(errors, path, 'cycle', 'Referencia circular no permitida.'); return; }
    ancestors.add(entry);
    const descriptors = Object.getOwnPropertyDescriptors(entry);
    if (Object.getOwnPropertySymbols(entry).length) issue(errors, path, 'json_value', 'Las claves Symbol no se pueden guardar.');
    if (Array.isArray(entry) && Object.keys(entry).length !== entry.length) {
      issue(errors, path, 'json_array', 'Las listas no pueden tener huecos ni propiedades adicionales.');
    }
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(entry) && key === 'length') continue;
      const childPath = Array.isArray(entry) ? `${path}[${key}]` : `${path}.${key}`;
      if (Array.isArray(entry) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= entry.length)) {
        issue(errors, childPath, 'json_array', 'Una lista solo puede tener índices consecutivos.'); continue;
      }
      if (['__proto__', 'prototype', 'constructor'].includes(key)) {
        issue(errors, childPath, 'unsafe_key', 'Clave reservada no permitida.'); continue;
      }
      if (!descriptor.enumerable || descriptor.get || descriptor.set) {
        issue(errors, childPath, 'json_value', 'Solo se admiten propiedades de datos enumerables.'); continue;
      }
      walk(descriptor.value, childPath, depth + 1);
      if (visited > 100_000) break;
    }
    ancestors.delete(entry);
  }
  walk(value, '$', 0);
  return errors;
}
