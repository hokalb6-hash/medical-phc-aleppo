import Link from "next/link";
import clsx from "clsx";

export type ClinicReportSource = "daily_entry" | "owner_daily_form" | "owner_monthly_form";

type TabDef = {
  id: ClinicReportSource;
  label: string;
  description: string;
  href: string;
};

type Props = {
  active: ClinicReportSource;
  tabs: TabDef[];
};

export function ClinicReportsSourceTabs({ active, tabs }: Props) {
  return (
    <nav
      aria-label="نوع تقرير العيادات"
      className="rounded-2xl border border-slate-200/90 bg-white/90 p-2 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm"
    >
      <ul className="grid gap-2 md:grid-cols-3">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                scroll={false}
                className={clsx(
                  "flex h-full flex-col rounded-xl px-4 py-3 text-right transition",
                  isActive
                    ? "border border-sy-green-200 bg-gradient-to-br from-sy-green-50 to-white shadow-sm ring-1 ring-sy-green-100/80"
                    : "border border-transparent hover:border-slate-200 hover:bg-slate-50/90",
                )}
              >
                <span
                  className={clsx(
                    "text-sm font-semibold",
                    isActive ? "text-sy-green-900" : "text-slate-800",
                  )}
                >
                  {tab.label}
                </span>
                <span className="mt-1 text-xs leading-relaxed text-slate-600">{tab.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
