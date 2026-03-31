const GroceriesLoading = () => {
  return (
    <main className="mx-auto grid w-[min(1240px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1240px)] max-[900px]:pt-5">
      <section className="grid gap-5 rounded-[30px] border border-[var(--border)] bg-[rgba(255,250,243,0.78)] p-6 shadow-[var(--shadow)]">
        <div className="animate-pulse grid gap-4">
          <div className="h-5 w-28 rounded-full bg-[rgba(90,64,42,0.14)]" />
          <div className="h-16 w-[min(420px,100%)] rounded-[18px] bg-[rgba(90,64,42,0.12)]" />
          <div className="h-4 w-[min(620px,100%)] rounded-full bg-[rgba(90,64,42,0.1)]" />
          <div className="h-4 w-full rounded-full bg-[rgba(181,82,51,0.1)]" />
        </div>
        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-[22px] border border-[var(--border)] bg-white/72 p-4"
            >
              <div className="h-4 w-24 rounded-full bg-[rgba(90,64,42,0.1)]" />
              <div className="mt-4 h-8 w-28 rounded-full bg-[rgba(90,64,42,0.14)]" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default GroceriesLoading;