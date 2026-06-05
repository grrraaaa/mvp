import Link from "next/link";
import { notFound } from "next/navigation";
import { SbbolHydratedBody } from "@/components/sbbol/SbbolHydratedBody";
import { CapturedSbbolPage } from "@/components/sbbol/CapturedSbbolPage";
import { SbbolPageHeader } from "@/components/sbbol/SbbolPageHeader";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { getSyntheticPageBody } from "@/lib/sbbol/syntheticPageContent";
import { getCapturedPageHtml } from "@/lib/sbbol/capturedOrigHtml";
import { getPageMeta } from "@/lib/sbbol/pageContent";
import { getOrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";
import { SUB_NAV, type NavId } from "@/lib/sbbol/navigation";

interface Props {
  path: string;
}

const SECTION_META: Record<string, { title: string; description: string; navId: NavId }> = {
  "/payments": { title: "Расчеты", description: "Платежи, переводы и работа с контрагентами.", navId: "payments" },
  "/statement": { title: "Выписка", description: "Выписки и справки по счетам.", navId: "statement" },
  "/salary": { title: "Зарплата", description: "Зарплатный проект и выплаты сотрудникам.", navId: "salary" },
  "/products": { title: "Продукты и услуги", description: "Кредиты, карты, депозиты и сервисы для бизнеса.", navId: "productsAndServices" },
  "/services": { title: "Сервисы", description: "Партнёрские и дополнительные сервисы.", navId: "partner-services" },
  "/other": { title: "Прочее", description: "Документы, справочники и дополнительные разделы.", navId: "other" },
  "/settings": { title: "Настройки", description: "Профиль, счета и безопасность.", navId: "user-account" },
};

function resolveMeta(path: string) {
  return getPageMeta(path) ?? (SECTION_META[path] ? { ...SECTION_META[path], path } : null);
}

export function SbbolRoutePage({ path }: Props) {
  const meta = resolveMeta(path);
  if (!meta) notFound();

  const capturedHtml = getCapturedPageHtml(path);
  const body = getSyntheticPageBody(path);
  const subLinks = SUB_NAV[meta.navId].filter((item) => item.href !== path);

  if (capturedHtml) {
    return (
      <SbbolAppLayout activeNav={meta.navId}>
        <CapturedSbbolPage html={capturedHtml} interactions={getOrigPageInteractionConfig(path)} />
      </SbbolAppLayout>
    );
  }

  return (
    <SbbolAppLayout activeNav={meta.navId}>
      <div className="sbbol-page-wrap w-full">
        <SbbolPageHeader title={meta.title} description={meta.description} />

        {body ? (
          <SbbolHydratedBody path={path} body={body} />
        ) : (
          <div className="sbbol-card p-6">
            <p className="text-sm text-sbbol-muted">Раздел в разработке.</p>
          </div>
        )}

        {subLinks.length > 0 && (
          <nav className="mt-8 pt-6 border-t border-sbbol-border" aria-label="См. также">
            <p className="text-xs font-semibold uppercase tracking-wide text-sbbol-muted mb-3">См. также</p>
            <div className="flex flex-wrap gap-2">
              {subLinks.map((item) => (
                <Link key={item.href} href={item.href} className="sbbol-chip-link">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </SbbolAppLayout>
  );
}
