import Link from "next/link";
import { SUB_NAV, type NavId } from "@/lib/sbbol/navigation";

interface Props {
  title: string;
  description?: string;
  navId: NavId;
}

export function SectionPage({ title, description, navId }: Props) {
  const links = SUB_NAV[navId];

  return (
    <div className="sbbol-dashboard px-4 sm:px-6 lg:px-10 py-8 max-w-[1200px]">
      <h1 className="text-2xl lg:text-[28px] font-semibold text-[#1f1f22] mb-2">{title}</h1>
      {description && <p className="text-sm text-[#565b62] mb-8 max-w-2xl">{description}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-[10px] border border-[#e4e8eb] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:border-[#90d0cc] hover:shadow-[0_4px_12px_rgba(16,127,140,0.12)] transition-all group"
          >
            <h2 className="text-base font-semibold text-[#1f1f22] group-hover:text-[#107f8c] transition-colors">
              {item.label}
            </h2>
            {item.description && (
              <p className="text-sm text-[#7d838a] mt-2">{item.description}</p>
            )}
            <span className="inline-block mt-3 text-sm text-[#107f8c] font-medium">Открыть →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
