import Navbar from "@/components/Navbar";
import { loadMyData, loadProjectDetails } from "@/lib/my-data";
import MyProjectsView from "./MyProjectsView";

export default async function MeuPainelPage() {
  const { fronts, projects, openTasks, currentQuarter, error } = await loadMyData();
  const { details, error: detailsError } = await loadProjectDetails(projects.map((project) => project.id));
  const failure = error ?? detailsError;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Meus projetos</h1>
        <p className="mb-6 text-sm text-slate-500">
          Seus projetos e tarefas, sincronizados do Jira. Use a aba Report para ver o detalhe de um projeto.
        </p>

        {failure ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {failure}</div>
        ) : projects.length === 0 ? (
          <div className="card text-sm text-slate-500">Nenhum projeto atribuído a você no momento.</div>
        ) : (
          <MyProjectsView
            fronts={fronts}
            projects={projects}
            details={details}
            openTasks={openTasks}
            currentQuarter={currentQuarter}
          />
        )}
      </main>
    </div>
  );
}
