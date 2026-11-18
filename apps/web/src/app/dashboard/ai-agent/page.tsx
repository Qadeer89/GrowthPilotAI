import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listAgentTasks } from "@growthpilot/core";
import { NewTaskForm } from "./NewTaskForm";
import { approveAgentStepAction } from "./actions";

const TASK_STATUS_COLOR: Record<string, string> = {
  planned: "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]",
  awaiting_approval: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  executing: "bg-sky-100 text-sky-700",
  completed: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

const STEP_STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]",
  approved: "bg-sky-100 text-sky-700",
  completed: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

export default async function AiAgentPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="gp-page-title">AI Marketing Agent</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Add a brand first.{" "}
          <Link href="/dashboard/brand" className="text-[var(--color-primary)] hover:underline">
            Go to Brand Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const tasks = await listAgentTasks(organizationId, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">AI Marketing Agent</h1>
      <p className="gp-page-subtitle">
        Describe what you want done. The agent plans it as a sequence of real tool calls, runs anything organic
        immediately, and stops for your approval before anything that spends money.
      </p>

      <section className="mt-6 gp-card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">New task</h2>
        <div className="mt-3">
          <NewTaskForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Tasks</h2>
        <div className="mt-2 flex flex-col gap-3">
          {tasks.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No tasks yet.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="gp-card p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--color-text)]">{task.requestText}</span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${TASK_STATUS_COLOR[task.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-faint)]">{task.brand.name}</p>

              <ol className="mt-3 flex flex-col gap-2">
                {task.steps.map((step) => (
                  <li key={step.id} className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[var(--color-text)]">
                        {step.toolName}
                        {step.requiresApproval && <span className="ml-1 text-amber-600">· paid</span>}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-xs capitalize ${STEP_STATUS_COLOR[step.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                        {step.status}
                      </span>
                    </div>
                    {step.reason && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{step.reason}</p>}
                    {step.failureReason && <p className="mt-1 break-all text-xs text-[var(--color-danger)]">{step.failureReason}</p>}
                    {step.status === "pending" && step.requiresApproval && (
                      <form action={approveAgentStepAction} className="mt-2">
                        <input type="hidden" name="agentStepId" value={step.id} />
                        <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">
                          Approve & continue
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
