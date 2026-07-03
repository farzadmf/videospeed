import esbuild from 'esbuild';
import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __dist = path.join(__dirname, '..', 'dist');
const __dist_ui = path.join(__dist, 'ui');

const isWatch = process.argv.includes('--watch');

// Live esbuild context in watch mode, kept so a config change can dispose it.
let ctx = null;

const common = {
  bundle: true,
  sourcemap: false, // set true locally if debugging
  minify: false,
  target: 'chrome114',
  platform: 'browser',
  legalComments: 'none',
  format: 'iife', // preserve side-effects and simple global init without ESM runtime
  define: { 'process.env.NODE_ENV': '"production"' },
};

async function copyStaticFiles() {
  const rootDir = path.resolve(__dirname, '..');
  const outDir = path.resolve(rootDir, 'dist');

  try {
    // Ensure the output directory exists (but don't empty it in watch mode)
    if (!isWatch) {
      await fs.emptyDir(outDir);
    } else {
      await fs.ensureDir(outDir);
    }

    // Paths to copy
    const pathsToCopy = {
      'manifest.json': [path.join(outDir, 'manifest.json')],
      'src/assets': [path.join(outDir, 'assets')],
      LICENSE: [path.join(outDir, 'LICENSE')],
      'CONTRIBUTING.md': [path.join(outDir, 'CONTRIBUTING.md')],
      'PRIVACY.md': [path.join(outDir, 'PRIVACY.md')],
      'README.md': [path.join(outDir, 'README.md')],
    };

    // Perform copy operations
    for (const [src, [dest, filter]] of Object.entries(pathsToCopy)) {
      await fs.copy(path.join(rootDir, src), dest, { filter });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd@HH:mm:ss');
    console.log(`[${timestamp}] ✅ Files updated ...`);

    // Inject version from package.json into dist/manifest.json
    const pkg = await fs.readJson(path.join(rootDir, 'package.json'));
    const manifestPath = path.join(outDir, 'manifest.json');
    const manifest = await fs.readJson(manifestPath);
    manifest.version = pkg.version;
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    console.log(`[${timestamp}] ✅ Manifest version set to ${pkg.version}`);
  } catch (error) {
    console.error('❌ Error copying static files:', error);
    process.exit(1);
  }
}

async function build() {
  try {
    const esbuildConfig = {
      ...common,
      entryPoints: {
        'styles/inject_new': 'src/styles/inject_new.css',
        'ui/options/options': 'src/ui/options/options.js',
        'ui/options/options-html': 'src/ui/options/options.html',
        'ui/popup/popup': 'src/ui/popup/popup.js',
        'ui/popup/popup-css': 'src/ui/popup/popup.css',
        'ui/popup/popup-html': 'src/ui/popup/popup.html',
        background: 'src/background.js',
        'content-bridge': 'src/entries/content-bridge.js',
        inject: 'src/entries/inject-entry.js',
      },
      outdir: 'dist',
      entryNames: '[dir]/[name]',
      loader: {
        '.html': 'copy',
      },
      plugins: [
        {
          name: 'copy-static-files',
          setup(build) {
            build.onStart(async () => {
              await copyStaticFiles();
            });
          },
        },
        {
          // These stylesheets are imported into JS and inlined as strings for a
          // shadow root, rather than emitted as files like the CSS entry points.
          name: 'css-as-text',
          setup(build) {
            build.onLoad({ filter: /(leader-indicator|shadow_new)\.css$/ }, async (args) => {
              const contents = await fs.readFile(args.path, 'utf8');
              return { contents, loader: 'text' };
            });
          },
        },
        {
          name: 'rename-files',
          setup(build) {
            build.onEnd(async () => {
              const rename = async (name, ext) => {
                const dir = path.join(__dist_ui, name);
                await fs.move(path.join(dir, `${name}-${ext}.${ext}`), path.join(dir, `${name}.${ext}`), { overwrite: true });
              };
              await rename('options', 'html');
              await rename('popup', 'html');
              await rename('popup', 'css');
            });
          },
        },
      ],
    };

    if (isWatch) {
      ctx = await esbuild.context(esbuildConfig);
      await ctx.watch();
      console.log('🔧 Watching for changes...');
    } else {
      await esbuild.build(esbuildConfig);
      const timestamp = format(new Date(), 'yyyy-MM-dd@HH:mm:ss');
      console.log(`[${timestamp}] ✅ Build complete`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// esbuild's watch snapshots this config at startup and never re-reads it, so
// editing build.mjs (e.g. adding a loader) would otherwise silently ship stale
// output. Watch the file ourselves and restart the build on change.
function watchConfig() {
  let timer = null;
  fs.watch(__filename, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log('🔄 build.mjs changed, restarting...');
      await ctx?.dispose();
      await build();
    }, 100);
  });
}

await build();

if (isWatch) {
  watchConfig();
}
