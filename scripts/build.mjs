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
      // await fs.copy(path.join(rootDir, src), dest, {
      //   filter: (src) => !path.basename(src).endsWith('.js'),
      // });
      fs.copy(path.join(rootDir, src), dest, { filter });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd@HH:mm:ss');
    console.log(`[${timestamp}] ✅ Files updated ...`);
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
        'styles/shadow_new': 'src/styles/shadow_new.css',
        'ui/options/options': 'src/ui/options/options.js',
        'ui/options/options-html': 'src/ui/options/options.html',
        'ui/popup/popup': 'src/ui/popup/popup.js',
        'ui/popup/popup-css': 'src/ui/popup/popup.css',
        'ui/popup/popup-html': 'src/ui/popup/popup.html',
        background: 'src/background.js',
        content: 'src/entries/content-entry.js',
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
      const ctx = await esbuild.context(esbuildConfig);
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

build();
