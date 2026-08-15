import type { NextConfig } from 'next';

// Importing for its side effect: parses and validates env vars at
// `next dev`/`next build` startup, failing fast instead of surfacing a
// missing/invalid value later as an obscure runtime error.
import './env';

const nextConfig: NextConfig = {};

export default nextConfig;
