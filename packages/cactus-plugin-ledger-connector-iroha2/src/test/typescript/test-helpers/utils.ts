/**
 * Utility functions used throughout the tests.
 */

/**
 * Adds random suffix to given string.
 * Can be used to generate unique names for testing.
 *
 * @param name
 * @returns unique string
 */
export function addRandomSuffix(name: string): string {
  return name + (Math.random() + 1).toString(36).substring(7);
}
