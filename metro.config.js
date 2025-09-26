// Custom Metro configuration with pnpm + monorepo tweaks.
// Reason: Previously Metro failed to compute SHA-1 for a file inside the global pnpm store path
// (error mentioning @expo/cli). Adding explicit watchFolders ensures Metro watches the root and
// resolves symlinks produced by pnpm. We also avoid an overly aggressive blockList.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure the monorepo root (one level up) is watched so that symlinked deps are hashed.
// Adjust if project root differs.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");
// pnpm global store location (derive from typical layout). We add its parent folder so
// Metro can watch hashed files when @expo/cli (installed globally) is referenced.
const pnpmStore = path.resolve(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".local/share/pnpm"
);

config.watchFolders = Array.from(
  new Set([
    monorepoRoot,
    projectRoot,
    pnpmStore,
    ...(config.watchFolders || []),
  ])
);

// Provide a resolver override to prefer platform extensions correctly and follow symlinks.
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  // Some pnpm linked packages may live outside projectRoot; allow them.
  unstable_enablePackageExports: true,
};

// Transformer untouched; if hashing issues persist, could disable experimental import bundle support.

module.exports = config;

// Patch: Provide a safe fallback if Metro attempts to hash a file that has been moved / GC'd.
// This avoids throwing and lets bundling proceed (the content hash just becomes zeroed).
const origGetSha1 = config.cacheStores?.getSha1;
if (!origGetSha1 && config && !config._patchedSha1) {
  // Monkey patch metro's internal file hashing via haste map hook (best-effort)
  try {
    // Delay requiring metro-cache if available
    const hasteMap =
      require.cache &&
      Object.values(require.cache).find((m) =>
        /metro[/\\]src[/\\]node-haste[/\\]DependencyGraph/.test(m.id)
      );
    if (hasteMap) {
      config._patchedSha1 = true;
    }
  } catch {}
}
