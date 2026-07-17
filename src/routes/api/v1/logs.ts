// GET /api/v1/logs — logs de requisições da API do usuário autenticado.
// Filtros: ?status=200&auth=api_key&method=GET&limit=50
import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { parseListParams, buildPagination } from "@/lib/api/v1/pagination";

export const Route = createFileRoute("/api/v1/logs")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, url, requestId }) => {
        const params = parseListParams(url);
        const from = (params.page - 1) * params.per_page;
        const to = from + params.per_page - 1;

        let q = ctx.supabase
          .from("api_request_logs")
          .select(
            "id, request_id, auth_type, method, path, status_code, error_code, duration_ms, created_at",
            { count: "exact" },
          )
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false })
          .range(from, to);

        const status = url.searchParams.get("status");
        if (status) q = q.eq("status_code", Number(status));
        const auth = url.searchParams.get("auth");
        if (auth) q = q.eq("auth_type", auth);
        const method = url.searchParams.get("method");
        if (method) q = q.eq("method", method.toUpperCase());

        const { data, count, error } = await q;
        if (error) throw new ApiError("internal_error", error.message, 500);

        return jsonOk(data ?? [], {
          requestId,
          pagination: buildPagination(params, count ?? 0),
        });
      }),
    },
  },
});
