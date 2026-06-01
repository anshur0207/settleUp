const SectionCard = ({ title, children, className = '' }) => {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-soft ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
      </div>
      {children}
    </section>
  );
};

export default SectionCard;
