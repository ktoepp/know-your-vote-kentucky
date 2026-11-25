'use client';

import NextLink from 'next/link';

/**
 * `next/link` re-exported from a client module.
 *
 * Next 16 resolves `next/link` to the plain `LinkComponent` function in the server layer, and a Server
 * Component cannot pass a function to a Client Component. MUI's `component={NextLink}` does exactly that.
 * Importing from here makes it a client reference, which can be passed. Use this in Server Components that
 * pass the link as a prop; Client Components can keep importing `next/link` directly.
 */
export default NextLink;
