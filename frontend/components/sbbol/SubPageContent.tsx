import Link from "next/link";
import { DemoPageBody } from "@/components/sbbol/DemoPageBody";
import { SbbolOrigPageContent } from "@/components/sbbol/SbbolOrigPageContent";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { getDemoPageBody } from "@/lib/sbbol/demoPageContent";
import { getDemoPageHtml } from "@/lib/sbbol/demoPageHtml";
import { getPageMeta } from "@/lib/sbbol/pageContent";
import { getOrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";
import { SUB_NAV, type NavId } from "@/lib/sbbol/navigation";
import { notFound } from "next/navigation";

interface Props {
  path: string;
}

function resolveMeta(path: string) {
  const meta = getPageMeta(path);
  if (meta) return meta;

  const sectionNav: Record<string, { title: string; description: string; navId: NavId }> = {
    "/payments": { title: "Расчеты", description: "Платежи, переводы и работа с контрагентами.", navId: "payments" },
    "/statement": { title: "Выписка", description: "Выписки и справки по счетам.", navId: "statement" },
    "/salary": { title: "Зарплата", description: "Зарплатный проект и выплаты сотрудникам.", navId: "salary" },
    "/products": { title: "Продукты и услуги", description: "Кредиты, карты, депозиты и сервисы для бизнеса.", navId: "productsAndServices" },
    "/services": { title: "Сервисы", description: "Партнёрские и дополнительные сервисы.", navId: "partner-services" },
    "/other": { title: "Прочее", description: "Документы, справочники и дополнительные разделы.", navId: "other" },
    "/settings": { title: "Настройки", description: "Профиль, счета и безопасность.", navId: "user-account" },
  };

  const section = sectionNav[path];
  if (section) return { ...section, path };

  return null;
}

export function SubPageContent({ path }: Props) {
  const meta = resolveMeta(path);
  if (!meta) notFound();

  const origHtml = getDemoPageHtml(path);
  const body = getDemoPageBody(path);
  const subLinks = SUB_NAV[meta.navId].filter((item) => item.href !== path);

  if (origHtml) {
    return (
      <SbbolAppLayout activeNav={meta.navId}>
        <SbbolOrigPageContent html={origHtml} interactions={getOrigPageInteractionConfig(path)} />
      </SbbolAppLayout>
    );
  }

  return (
    <SbbolAppLayout activeNav={meta.navId}>
      <div className="sbbol-dashboard px-4 sm:px-6 lg:px-10 py-8 max-w-[1200px]">
        <h1 className="text-2xl lg:text-[28px] font-semibold text-[#1f1f22] mb-2">{meta.title}</h1>
        <p className="text-sm text-[#565b62] mb-6 max-w-2xl">{meta.description}</p>

        {body ? (
          <DemoPageBody body={body} />
        ) : (
          <div className="bg-white rounded-[10px] border border-[#e4e8eb] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-[#7d838a]">Раздел в разработке.</p>
          </div>
        )}

        {subLinks.length > 0 && (
          <nav className="mt-8 pt-6 border-t border-[#e4e8eb]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d838a] mb-3">См. также</p>
            <div className="flex flex-wrap gap-2">
              {subLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm px-3 py-1.5 rounded-md border border-[#e4e8eb] text-[#107f8c] hover:bg-[#e5fcf7] hover:border-[#90d0cc] transition-colors"
                >
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
