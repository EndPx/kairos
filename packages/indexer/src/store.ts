import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ExecutionAttemptRecord, OffchainDecisionRecord, PersistedIndexState } from './types.js';

export interface IndexStore {
  load(): Promise<PersistedIndexState | null>;
  save(state: PersistedIndexState): Promise<void>;
}

export class JsonIndexStore implements IndexStore {
  constructor(private readonly path: string) {}

  async load(): Promise<PersistedIndexState | null> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as PersistedIndexState;
      if (parsed.schemaVersion !== 1) throw new Error('Unsupported index schema version.');
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(state: PersistedIndexState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.path);
  }
}

/** Offchain decisions use a separate file and a mandatory provenance discriminator. */
export class DecisionJournal {
  constructor(private readonly path: string) {}

  async append(record: OffchainDecisionRecord): Promise<void> {
    if (record.kind !== 'OFFCHAIN_DECISION') throw new Error('Decision journal accepts offchain records only.');
    await mkdir(dirname(this.path), { recursive: true });
    const existing = await this.load();
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify([...existing, record], null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(temporary, this.path);
  }

  async load(): Promise<readonly OffchainDecisionRecord[]> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as OffchainDecisionRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
}

/** Transaction attempts remain separate from confirmed chain events and decision traces. */
export class ExecutionAttemptJournal {
  constructor(private readonly path: string) {}

  async append(record: ExecutionAttemptRecord): Promise<void> {
    if (record.kind !== 'EXECUTION_ATTEMPT') throw new Error('Execution journal accepts attempt records only.');
    await mkdir(dirname(this.path), { recursive: true });
    const existing = await this.load();
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify([...existing, record], null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(temporary, this.path);
  }

  async load(): Promise<readonly ExecutionAttemptRecord[]> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as ExecutionAttemptRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
}
