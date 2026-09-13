import { build } from 'esbuild';
import { createRequire } from 'node:module';

/**
 * Bundles one app module with esbuild, replacing the `@/…` imports named in `stubs` with inline source.
 * Everything else (next, react, node built-ins) stays external. No network, no database, no mail.
 */
export async function load(path: string, stubs: Record<string, string>, importer = import.meta.url): Promise<any> {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, jsx: 'automatic', platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'stubs', setup(b) {
      // keys are the import specifiers as written: '@/lib/x' or, inside lib, a relative './x'
      b.onResolve({ filter: /.*/ }, a => stubs[a.path] ? { path: a.path, namespace: 'stub' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({ contents: stubs[a.path], loader: 'tsx', resolveDir: process.cwd() }));
    } }],
  });
  const mod = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(importer), mod, mod.exports);
  return mod.exports;
}

/** The visible text of a React element tree, without rendering (child components are not descended into). */
export function textOf(n: unknown): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  const props = (n as { props?: { children?: unknown } }).props;
  return props ? textOf(props.children) : '';
}
