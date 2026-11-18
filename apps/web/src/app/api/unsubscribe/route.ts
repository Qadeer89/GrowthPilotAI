import { unsubscribeByToken } from "@growthpilot/core";

function html(body: string) {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">${body}</body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return html("<h1>Invalid unsubscribe link</h1>");

  const result = await unsubscribeByToken(token);
  if (!result) return html("<h1>Invalid or expired unsubscribe link</h1>");

  return html(`<h1>You're unsubscribed</h1><p>${result.email} will not receive further emails from us.</p>`);
}
