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
 *
 * Example:
 * - The DEBUG variable below is defined by esbuild at build time
 */

declare const DEBUG: boolean;
