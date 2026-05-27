/**
 * Badge constants — the source of truth for who has what.
 *
 * VERIFIED: blue Instagram-style checkmark. Will eventually be granted broadly.
 * COFOUNDER: exclusive glowing badge. Permanently locked to the two co-founders.
 */

export const VERIFIED_USER_IDS = new Set([
  'user_3EF5WkzcBq2rWlhkl7ZFac2XEcX', // Gavin
  'user_3EF8XxCZHxbhL1d7OxK7zoS4Lzk', // Luca
]);

// This set must NEVER be modified after launch.
export const COFOUNDER_USER_IDS = new Set([
  'user_3EF5WkzcBq2rWlhkl7ZFac2XEcX', // Gavin
  'user_3EF8XxCZHxbhL1d7OxK7zoS4Lzk', // Luca
]);

export const isVerified  = (id: string) => VERIFIED_USER_IDS.has(id);
export const isCofounder = (id: string) => COFOUNDER_USER_IDS.has(id);
