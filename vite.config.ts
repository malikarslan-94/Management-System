import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dynamicImport from 'vite-plugin-dynamic-import';
import typescript from '@rollup/plugin-typescript';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add this to handle TypeScript files in JSX
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['babel-plugin-macros', '@emotion/babel-plugin']
      }
    }),
    dynamicImport(),
    typescript({
      include: ["src/**/*.ts", "src/**/*.tsx"],
      tsconfig: "./tsconfig.json"
    })
  ],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  build: {
    outDir: 'build',
    sourcemap: true
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx'
      }
    }
  }
});
