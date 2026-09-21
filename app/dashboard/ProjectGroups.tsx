import ProgressBar from "@/components/ProgressBar";
import ProjectRow from "@/components/overview/ProjectRow";
import { HEALTH_RANK, NO_OWNER_LABEL, type FrontSummary } from "@/lib/overview";

export default function ProjectGroups({ summaries, defaultOpen }: { summaries: FrontSummary[]; defaultOpen: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Projetos por frente</h2>
      <div className="space-y-3">
        {summaries.map((summary) => {
          const sorted = [...summary.projects].sort(
            (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name),
          );
          return (
            <details key={summary.front.id} open={defaultOpen} className="group card p-0">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm font-semibold text-slate-800">
                  <span aria-hidden className="mr-2 inline-block text-slate-400 transition group-open:rotate-90">
                    ▸
                  </span>
                  {summary.front.name}
                  <span className="ml-2 font-normal text-slate-400">· {summary.projects.length} projetos</span>
                </span>
                <span className="w-44">
                  <ProgressBar pct={summary.pct} />
                </span>
              </summary>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {sorted.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    subtitle={`${project.owner ?? NO_OWNER_LABEL} · ${project.key}`}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
