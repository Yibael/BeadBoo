import { type Project, validateProjects } from '../lib/projects';
export type StoragePort = { read: (slot: 0 | 1) => string | null; write: (slot: 0 | 1, value: string) => void };
type Snapshot = { schema: 1; revision: number; projects: Project[] };
export class ProjectRepository {
  private revision = 0;
  private ready = false;
  projects: Project[] = [];
  constructor(private storage: StoragePort) {}
  load(): { projects: Project[]; recovered: boolean } {
    const snapshots: Snapshot[] = []; let invalid = false;
    for (const slot of [0, 1] as const) {
      // Access failures must not look like an empty library.
      const raw = this.storage.read(slot);
      if (raw === null) continue;
      try {
        const data = JSON.parse(raw) as Snapshot;
        if (data.schema !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error();
        validateProjects(data.projects); snapshots.push(data);
      } catch { invalid = true; }
    }
    if (invalid && !snapshots.length) throw new Error('图纸记录暂时无法读取。原始文件已保留，请重试。');
    const latest = snapshots.sort((a, b) => b.revision - a.revision)[0];
    this.revision = latest?.revision ?? 0; this.projects = latest?.projects ?? []; this.ready = true;
    return { projects: this.projects, recovered: invalid };
  }
  commit(projects: Project[]): Project[] {
    if (!this.ready) throw new Error('图纸尚未读取完成');
    validateProjects(projects);
    const revision = this.revision + 1;
    // Alternate slots: a partial write leaves the previous valid snapshot intact.
    this.storage.write((revision % 2) as 0 | 1, JSON.stringify({ schema: 1, revision, projects }));
    this.revision = revision; this.projects = projects;
    return projects;
  }
}
