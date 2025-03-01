// =========================================================
// globals.d.ts
// =========================================================
/**
 * GLOBAL DECLARATIONS FILE
 *
 * Purpose:
 * - Declares variables, types, and interfaces that exist in the GLOBAL scope
 * - These declarations are available everywhere WITHOUT importing
 * - Used for variables injected at build time (like by esbuild's define)
 * - Does NOT generate any JavaScript - purely for TypeScript type checking
 *
 * Usage:
 * - Do NOT use export/import with declarations in this file
 * - Make sure this file is included in your tsconfig.json (via include or files)
 * - Place in project root, not in src/ folder
 *
 * Example:
 * - The DEBUG variable below is defined by esbuild at build time
 * - No need to import it in your code, just use it directly: if (DEBUG) { ... }
 */

declare const DEBUG: boolean;
