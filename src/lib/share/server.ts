/**
 * Online quote acceptance (GET/POST /api/public/quote/:token). Never import from browser code.
 *
 * A quote shared with its link carries a random token (Quote.shareToken). Anyone holding the
 * link can read that one quote and accept it; nothing else of the company is reachable. The
 * server runs these queries itself (asServer) after checking the token's shape.
 */
import { asServer, json, sameOrigin, withPool } from "@/lib/db/server";

export const TOKEN = /^[a-z0-9]{24}$/;

/** What the client sees: the printable quote, without the company's internal fields. */
const PUBLIC_FIELDS = [
  "number",
  "status",
  "issueDate",
  "validUntil",
  "company",
  "client",
  "lines",
  "globalDiscount",
  "deposit",
  "terms",
  "delivery",
  "exemptionNote",
  "template",
  "accent",
  "lang",
  "style",
  "watermark",
  "acceptedAt",
  "acceptedBy",
] as const;

type Row = { quote: Record<string, unknown>; logo: string | null };

// Companies that are suspended or refused no longer share their quotes.
const FIND = `
  select q.value as quote, s.value ->> 'logo' as logo
  from public.workspace_data w
  join public.organizations o on o.id = w.organization_id
  cross join lateral jsonb_array_elements(w.value) as q(value)
  left join public.workspace_data s on s.organization_id = w.organization_id and s.key = 'settings'
  where w.key = 'quotes' and jsonb_typeof(w.value) = 'array'
    and q.value ->> 'shareToken' = $1
    and o.approval_status in ('pending', 'approved')
  limit 1`;

const pick = (q: Record<string, unknown>) =>
  Object.fromEntries(PUBLIC_FIELDS.filter((k) => k in q).map((k) => [k, q[k]]));

export async function handleSharedQuoteGet(token: string) {
  if (!TOKEN.test(token)) return json({ error: "not_found" }, 404);
  const res = await withPool((pool) =>
    asServer(pool, async (db) => {
      const { rows } = await db.query<Row>(FIND, [token]);
      const r = rows[0];
      if (!r) return json({ error: "not_found" }, 404);
      return json({ quote: pick(r.quote), logo: r.logo ?? "" });
    }),
  );
  return res ?? json({ error: "not_configured" }, 503);
}

/** Marks the quote accepted by the named person, once, while it is still valid. */
export async function handleSharedQuoteAccept(request: Request, token: string) {
  if (!TOKEN.test(token)) return json({ error: "not_found" }, 404);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) return json({ error: "name" }, 400);

  const res = await withPool((pool) =>
    asServer(pool, async (db) => {
      const { rows } = await db.query<Row>(FIND, [token]);
      const q = rows[0]?.quote;
      if (!q) return json({ error: "not_found" }, 404);
      if (q["status"] === "accepte") return json({ ok: true, already: true });
      if (q["status"] === "refuse") return json({ error: "refused" }, 409);
      const todayIso = new Date().toISOString().slice(0, 10);
      if (typeof q["validUntil"] === "string" && q["validUntil"] < todayIso)
        return json({ error: "expired" }, 409);
      const acceptedAt = new Date().toISOString();
      await db.query(
        `update public.workspace_data w
            set value = (
              select jsonb_agg(
                       case when e ->> 'shareToken' = $1
                            then e || jsonb_build_object(
                                   'status', 'accepte', 'acceptedAt', $2::text, 'acceptedBy', $3::text)
                            else e end
                       order by i)
              from jsonb_array_elements(w.value) with ordinality as x(e, i))
          where w.key = 'quotes'
            and w.value @> jsonb_build_array(jsonb_build_object('shareToken', $1::text))`,
        [token, acceptedAt, name],
      );
      return json({ ok: true, acceptedAt });
    }),
  );
  return res ?? json({ error: "not_configured" }, 503);
}
