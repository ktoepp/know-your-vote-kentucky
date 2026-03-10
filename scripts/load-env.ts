/**
 * Load .env.local before any other modules.
 * Import this FIRST in scripts that need env vars.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
