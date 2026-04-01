# c66fc3d — Release infrastructure

Build infra items to consider adopting:

- **RELEASE mode**: `RELEASE=1` env var enables esbuild minification for production builds.
- **package-release.js**: Creates versioned `release/videospeed-{version}.zip` with validation.
- **Pre-push hook** (`.husky/pre-push`): Runs lint + tests before every push.
