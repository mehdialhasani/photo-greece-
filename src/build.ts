// Identifies this build. The page compares it with version.json to notice a newer deploy.
export const BUILD = process.env.GITHUB_SHA ?? String(Date.now());
