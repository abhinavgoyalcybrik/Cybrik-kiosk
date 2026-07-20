export type DocumentTask = {
  id: string;
  title: string;
  detail: string;
  status: "ready" | "needs-input";
};

export function DocumentTaskList({
  activeTaskId,
  onPreview,
}: {
  activeTaskId: string | null;
  onPreview: (id: string) => void;
}) {
  const tasks: DocumentTask[] = [
    {
      id: "sop",
      title: "Statement of purpose",
      detail: "Route-specific narrative · 850 words",
      status: "ready",
    },
    {
      id: "resume",
      title: "Academic resume",
      detail: "One-page profile of work and academics",
      status: "ready",
    },
    {
      id: "transcript",
      title: "Semester transcripts",
      detail: "Upload from your institution before advisor review",
      status: "needs-input",
    },
    {
      id: "references",
      title: "Academic references",
      detail: "Two referees requested for your top route",
      status: "needs-input",
    },
  ];

  return (
    <div className="portal-document-list">
      {tasks.map((task, index) => {
        const ready = task.status === "ready";
        return (
          <article className="portal-document-row" key={task.id}>
            <span className={`portal-document-index ${ready ? "is-ready" : ""}`}>
              0{index + 1}
            </span>
            <div>
              <h3>{task.title}</h3>
              <p>{task.detail}</p>
            </div>
            <span className={ready ? "portal-document-status is-ready" : "portal-document-status"}>
              {ready ? "Preview ready" : "Need input"}
            </span>
            <button onClick={() => onPreview(task.id)} type="button">
              {activeTaskId === task.id ? "Preview open" : "Preview"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
