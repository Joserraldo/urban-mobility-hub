import type { ReactNode } from "react";

import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import type { LegalSection } from "@/content/legal";

export function LegalPage({
  title,
  lead,
  sections,
  children,
}: {
  title: string;
  lead: string;
  sections?: LegalSection[];
  children?: ReactNode;
}) {
  return (
    <SiteLayout>
      <PageHeading eyebrow="Legal" title={title} lead={lead} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        {sections?.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="text-muted-foreground">
                {t}
              </p>
            ))}
          </section>
        ))}
        {children}
      </div>
    </SiteLayout>
  );
}
