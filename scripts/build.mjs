import esbuild from 'esbuild';
import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      'manifest.json': path.join(outDir, 'manifest.json'),
      'src/assets': path.join(outDir, 'assets'),
      'src/ui': path.join(outDir, 'ui'),
      'src/styles': path.join(outDir, 'styles'),
      LICENSE: path.join(outDir, 'LICENSE'),
      'CONTRIBUTING.md': path.join(outDir, 'CONTRIBUTING.md'),
      'PRIVACY.md': path.join(outDir, 'PRIVACY.md'),
      'README.md': path.join(outDir, 'README.md'),
    };

    // Perform copy operations
    for (const [src, dest] of Object.entries(pathsToCopy)) {
      // await fs.copy(path.join(rootDir, src), dest, {
      //   filter: (src) => !path.basename(src).endsWith('.js'),
      // });
      await fs.copy(path.join(rootDir, src), dest);
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd@HH:mm:ss');
    console.log(`[${timestamp}] ✅ Static files copied`);
  } catch (error) {
    console.error('❌ Error copying static files:', error);
    process.exit(1);
  }
}

async function build() {
  try {
    // Dynamically find all CSS files in src/styles
    const stylesDir = path.resolve(__dirname, '..', 'src', 'styles');
    const styleFiles = await fs.readdir(stylesDir);
    const cssFiles = styleFiles.filter((file) => file.endsWith('.css'));

    // Create dynamic entry points for CSS files
    const styleEntryPoints = {};
    cssFiles.forEach((file) => {
      const name = path.basename(file, '.css');
      styleEntryPoints[`styles/${name}`] = `src/styles/${file}`;
    });

    // Create entry points for HTML files
    const htmlEntryPoints = {
      'ui/options/options.html': 'src/ui/options/options.html',
      'ui/popup/popup.html': 'src/ui/popup/popup.html',
    };

    const esbuildConfig = {
      ...common,
      entryPoints: {
        content: 'src/entries/content-entry.js',
        inject: 'src/entries/inject-entry.js',
        background: 'src/background.js',
        'ui/popup/popup': 'src/ui/popup/popup.js',
        'ui/options/options': 'src/ui/options/options.js',
        ...styleEntryPoints,
        ...htmlEntryPoints,
      },
      outdir: 'dist',
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
