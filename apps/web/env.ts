import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

// Built from explicit property access, not a `process.env` spread - Next.js's
// compiler only statically inlines literal `process.env.NEXT_PUBLIC_*` member
// expressions into the client bundle, not a blanket object pass-through, so
// this is the form that resolves correctly in both server and client code.
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
