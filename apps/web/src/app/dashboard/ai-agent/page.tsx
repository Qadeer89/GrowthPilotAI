import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listAgentTasks } from "@growthpilot/core";
import { NewTaskForm } from "./NewTaskForm";
import { approveAgentStepAction } from "./actions";

const TASK_STATUS_COLOR: Record<string, string> = {
  planned: "bg-slate-100 text-slate-600",
  awaiting_approval: "bg-amber-100 text-amber-700",
  executing: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const STEP_STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  approved: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export default async function AiAgentPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Marketing Agent</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add a brand first.{" "}
          <Link href="/dashboard/brand" className="text-indigo-600 hover:underline">
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
      <h1 className="text-xl font-semibold text-slate-900">AI Marketing Agent</h1>
      <p className="mt-1 text-sm text-slate-500">
        Describe what you want done. The agent plans it as a sequence of real tool calls, runs anything organic
        immediately, and stops for your approval before anything that spends money.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">New task</h2>
        <div className="mt-3">
          <NewTaskForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Tasks</h2>
        <div className="mt-2 flex flex-col gap-3">
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{task.requestText}</span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${TASK_STATUS_COLOR[task.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{task.brand.name}</p>

              <ol className="mt-3 flex flex-col gap-2">
                {task.steps.map((step) => (
                  <li key={step.id} className="rounded border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-700">
                        {step.toolName}
                        {step.requiresApproval && <span className="ml-1 text-amber-600">· paid</span>}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-xs capitalize ${STEP_STATUS_COLOR[step.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {step.status}
                      </span>
                    </div>
                    {step.reason && <p className="mt-1 text-xs text-slate-500">{step.reason}</p>}
                    {step.failureReason && <p className="mt-1 break-all text-xs text-red-600">{step.failureReason}</p>}
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
