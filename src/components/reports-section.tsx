type ReportsSectionProps = {
  step: string | number;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function ReportsSection({ step, title, description, children }: ReportsSectionProps) {
  return (
    <section className="scroll-mt-6">
      <header className="mb-4 flex flex-col gap-1 border-b border-slate-200/90 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sy-green-600 to-sy-green-800 text-xs font-bold text-white shadow-md ring-2 ring-sy-green-100"
            aria-hidden
          >
            {step}
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
