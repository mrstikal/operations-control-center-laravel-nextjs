/**
 * Strict form and filter typing utilities to replace generic `Record<string, string>`.
 *
 * This module provides:
 * - Better type inference for form values
 * - Stricter field key validation
 * - Helper utilities for common form patterns
 */

/**
 * Maps field keys to their expected value types.
 *
 * @example
 * type UserForm = FormSchema<'name' | 'email' | 'age'>;
 * // Expects: { name: string, email: string, age: string }
 */
export type FormSchema<TKeys extends string = string> = Record<TKeys, string>;

/**
 * Maps field keys to string-only values (for filters, query params, etc.).
 *
 * @example
 * type Filters = FilterSchema<'status' | 'name'>;
 * // Expects: { status: string, name: string }
 */
export type FilterSchema<TKeys extends string = string> = Record<TKeys, string>;

/**
 * Extracts the allowed keys from a form schema type.
 *
 * @example
 * type UserForm = FormSchema<'name' | 'email'>;
 * type Keys = SchemaKeys<UserForm>; // 'name' | 'email'
 */
export type SchemaKeys<T extends Record<string, string>> = keyof T & string;

/**
 * Creates a type-safe object with all schema keys initialized to default values.
 *
 * @example
 * type UserForm = FormSchema<'name' | 'email'>;
 * const defaults: SchemaDefaults<UserForm> = { name: '', email: '' };
 */
export type SchemaDefaults<T extends Record<string, string>> = {
  [K in keyof T]: string;
};

/**
 * Helper function to safely initialize form values from schema keys.
 *
 * @example
 * const defaults = initializeFormValues<UserForm>(['name', 'email']);
 * // Returns: { name: '', email: '' }
 */
export function initializeFormValues<T extends FormSchema>(keys: SchemaKeys<T>[]): Partial<T> {
  return keys.reduce((acc, key) => {
    acc[key] = "" as T[SchemaKeys<T>];
    return acc;
  }, {} as Partial<T>);
}

/**
 * Helper to merge initial values with defaults while maintaining type safety.
 *
 * @example
 * const merged = mergeFormValues(defaults, { name: 'John' });
 */
export function mergeFormValues<T extends FormSchema>(
  defaults: Partial<T>,
  overrides?: Partial<T>
): Partial<T> {
  return { ...defaults, ...(overrides ?? {}) };
}
