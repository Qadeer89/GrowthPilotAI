import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  listBrands,
  getAnalyticsSummary,
  listAnalystQueries,
  listOptimizationRecommendations,
} from "@growthpilot/core";
import { AskAnalystForm } from "./AskAnalystForm";
import { detectOptimizationAction, approveRecommendationAction, rejectRecommendationAction } from "./actions";

const DATA_QUALITY_COLOR: Record<string, string> = {
  provider_reported: "bg-emerald-100 text-emerald-700",
  estimated: "bg-sky-100 text-sky-700",
  attributed: "bg-sky-100 text-sky-700",
  missing: "bg-slate-100 text-slate-500",
};

const REC_STATUS_COLOR: Record<string, string> = {
  awaiting_approval: "bg-amber-100 text-amber-700",
  executing: "bg-sky-100 text-sky-700",
  measured: "bg-emerald-100 text-emerald-700",
  rejected: "bg-slate-100 text-slate-500",
  failed: "bg-red-100 text-red-700",
};

export default async function AnalyticsPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Analytics & Intelligence</h1>
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

  const [metrics, queries, recommendations] = await Promise.all([
    getAnalyticsSummary(organizationId, session!.user.id),
    listAnalystQueries(organizationId, brands[0].id, session!.user.id),
    listOptimizationRecommendations(organizationId, session!.user.id),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Analytics & Intelligence</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every number below carries a data_quality label. A channel with no real data yet is shown as missing, never
        estimated or guessed.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Metrics</h2>
        <div className="mt-3 flex flex-col gap-2">
          {metrics.map((m, i) => (
            <div key={`${m.channel}:${m.metricKey}:${i}`} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
              <div>
                <span className="font-mono text-xs uppercase text-slate-400">{m.channel}</span>
                <p className="font-medium text-slate-900">{m.metricKey.replace(/_/g, " ")}</p>
                {m.note && <p className="mt-0.5 text-xs text-slate-500">{m.note}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-slate-900">{m.value === null ? "—" : m.value}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${DATA_QUALITY_COLOR[m.dataQuality] ?? "bg-slate-100 text-slate-600"}`}>
                  {m.dataQuality.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">AI Marketing Analyst</h2>
        <p className="mt-1 text-xs text-slate-500">
          Answers only from the real metrics above. Anything it can&apos;t answer from real data is listed as a gap,
          never guessed.
        </p>
        <div className="mt-3">
          <AskAnalystForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {queries.length === 0 && <p className="text-sm text-slate-500">No questions asked yet.</p>}
          {queries.map((q) => {
            const answer = q.answer as {
              summary?: string;
              answer?: string;
              dataGaps?: string[];
              recommendations?: string[];
            };
            return (
              <div key={q.id} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">Q: {q.question}</p>
                <p className="mt-1 text-slate-700">{answer.answer}</p>
                {answer.dataGaps && answer.dataGaps.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-amber-700">Data gaps</p>
                    <ul className="list-inside list-disc text-xs text-amber-700">
                      {answer.dataGaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {answer.recommendations && answer.recommendations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-500">Recommendations</p>
                    <ul className="list-inside list-disc text-xs text-slate-600">
                      {answer.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Optimization recommendations</h2>
          <form action={detectOptimizationAction}>
            <button className="rounded-md bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600">
              Scan for opportunities
            </button>
          </form>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Detect → Analyze → Recommend run automatically on scan; nothing executes until you approve it below.
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {recommendations.length === 0 && <p className="text-sm text-slate-500">No recommendations yet.</p>}
          {recommendations.map((r) => (
            <div key={r.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-700">{r.type}</span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${REC_STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
              {r.relatedAdCampaign && <p className="mt-1 text-xs text-slate-400">{r.relatedAdCampaign.name}</p>}
              <p className="mt-1 text-slate-700">{r.rationale}</p>
              <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${DATA_QUALITY_COLOR[r.dataQuality] ?? "bg-slate-100 text-slate-600"}`}>
                {r.dataQuality.replace("_", " ")}
              </span>
              {r.failureReason && <p className="mt-1 text-xs text-red-600">{r.failureReason}</p>}
              {r.measurement != null && (
                <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-500">
                  {JSON.stringify(r.measurement, null, 2)}
                </pre>
              )}
              {r.status === "awaiting_approval" && (
                <div className="mt-3 flex gap-2">
                  <form action={approveRecommendationAction}>
                    <input type="hidden" name="recommendationId" value={r.id} />
                    <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">
                      Approve
                    </button>
                  </form>
                  <form action={rejectRecommendationAction}>
                    <input type="hidden" name="recommendationId" value={r.id} />
                    <button className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500">
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
