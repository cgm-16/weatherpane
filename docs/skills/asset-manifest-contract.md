# Asset and manifest contract

## Hard rules
- Semantic asset keys in app code
- Manifest resolves keys to URLs
- Bundled baseline manifest
- Optional remote manifest override on next app load only
- Remote asset failure -> immediate deterministic local fallback
- No mid-session manifest hot swap

## Asset contract
- master ratio: 3:2
- master size: 2400x1600
- format: WebP
- max target size: 400 KB
- left 40% safe zone
- top 15% and bottom 20% low-detail safety margins
- right-weighted subject composition
