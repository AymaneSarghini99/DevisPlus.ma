import { createFileRoute, notFound } from "@tanstack/react-router";
import { GuideArticle } from "@/components/GuideArticle";
import { MarketingHeader } from "@/components/MarketingHeader";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { guideBySlug } from "@/guides/guides";
import { articleLd, jsonLd, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = guideBySlug(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData, match }) => {
    const guide = loaderData?.guide;
    if (!guide) return {};
    const l = (match.context as { locale?: unknown }).locale;
    const path = `/guides/${guide.slug}`;
    const head = seoHead({
      path,
      title: guide.title,
      description: guide.description,
      locale: isLocale(l) ? l : DEFAULT_LOCALE,
      index: true,
    });
    return {
      ...head,
      meta: [...head.meta, { property: "og:type", content: "article" }],
      scripts: articleLd({
        path,
        headline: guide.h1,
        description: guide.description,
        published: guide.published,
        updated: guide.updated,
      }).map(jsonLd),
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <GuideArticle guide={guide} />
    </div>
  );
}
