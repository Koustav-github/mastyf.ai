import { describe, it, expect, afterEach } from 'vitest';
import { evaluatePathGuard } from '../../src/policy/path-guard.js';

describe('evaluatePathGuard', () => {
  afterEach(() => {
    delete process.env.MASTYF_AI_WORKSPACE;
    delete process.env.MASTYF_AI_ALLOWED_PATH_PREFIXES;
    delete process.env.MASTYF_AI_REMOTE_SSH;
    delete process.env.MASTYF_AI_REMOTE_PATH_MAP;
  });

  it('blocks filesystem root', () => {
    expect(evaluatePathGuard(['/']).block).toBe(true);
  });

  it('blocks .ssh paths', () => {
    expect(evaluatePathGuard(['/home/user/.ssh/config']).block).toBe(true);
  });

  it('blocks kubernetes kubeconfig paths', () => {
    expect(evaluatePathGuard(['/root/.kube/config']).block).toBe(true);
    expect(evaluatePathGuard(['.kube/config']).block).toBe(true);
    expect(evaluatePathGuard(['/etc/kubernetes/admin.conf']).block).toBe(true);
  });

  it('scopes to workspace when set', () => {
    process.env.MASTYF_AI_WORKSPACE = '/workspace/app';
    expect(evaluatePathGuard(['/workspace/app/src/a.ts']).block).toBe(false);
    expect(evaluatePathGuard(['/etc/passwd']).block).toBe(true);
    const outside = evaluatePathGuard(['/tmp/other']);
    expect(outside.block).toBe(true);
  });

  it('matches a Windows workspace with drive letters, backslashes and capitals', () => {
    process.env.MASTYF_AI_WORKSPACE = 'C:\\Users\\Manna\\mastyf-demo';
    expect(evaluatePathGuard(['C:\\Users\\Manna\\mastyf-demo\\notes.txt']).block).toBe(false);
    expect(evaluatePathGuard(['C:/Users/Manna/mastyf-demo/sub/a.md']).block).toBe(false);
    expect(evaluatePathGuard(['c:/users/manna/mastyf-demo/a.md']).block).toBe(false);
    expect(evaluatePathGuard(['C:/Users/Manna/mastyf-demo-evil/a.md']).block).toBe(true);
    expect(evaluatePathGuard(['C:/Users/Manna/mastyf-demo/../../Windows/win.ini']).block).toBe(true);
    expect(evaluatePathGuard(['D:/other/file.txt']).block).toBe(true);
  });

  it('matches a macOS workspace under /Users', () => {
    process.env.MASTYF_AI_WORKSPACE = '/Users/Ada/Projects/app';
    expect(evaluatePathGuard(['/Users/Ada/Projects/app/src/index.ts']).block).toBe(false);
    expect(evaluatePathGuard(['/Users/Ada/Projects/other/x']).block).toBe(true);
  });

  it('normalizes MASTYF_AI_ALLOWED_PATH_PREFIXES the same way', () => {
    process.env.MASTYF_AI_ALLOWED_PATH_PREFIXES = 'C:\\Data\\Shared, /Users/Ada/Docs';
    expect(evaluatePathGuard(['C:/Data/Shared/report.csv']).block).toBe(false);
    expect(evaluatePathGuard(['/Users/Ada/Docs/a.txt']).block).toBe(false);
    expect(evaluatePathGuard(['C:/Data/Private/x']).block).toBe(true);
  });

  it('translates local paths under Remote SSH workspace map', () => {
    process.env.MASTYF_AI_REMOTE_SSH = 'true';
    process.env.MASTYF_AI_REMOTE_PATH_MAP = 'C:/Users/dev/app=/home/vscode/app';
    process.env.MASTYF_AI_WORKSPACE = 'C:/Users/dev/app';
    expect(evaluatePathGuard(['C:/Users/dev/app/src/a.ts']).block).toBe(false);
    expect(evaluatePathGuard(['C:/Users/dev/other/secret']).block).toBe(true);
  });
});
