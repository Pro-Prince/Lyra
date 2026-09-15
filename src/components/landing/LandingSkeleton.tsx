export function HeroSkeleton() {
  return (
    <div className="w-full bg-[var(--bg-base)] py-8 sm:py-12 lg:py-16 animate-pulse">
      <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
        <div className="h-4 w-24 bg-[var(--bg-surface)] rounded mb-4" />
        <div className="h-16 w-full max-w-lg bg-[var(--bg-surface)] rounded mb-6" />
        <div className="h-20 w-full max-w-md bg-[var(--bg-surface)] rounded mb-8" />
        <div className="h-12 w-48 bg-[var(--bg-surface)] rounded-full" />
      </div>
    </div>
  );
}

export function WardrobeSkeleton() {
  return (
    <div className="w-full mt-16 sm:mt-20 py-10 animate-pulse">
      <div className="text-center mb-10 px-6">
        <div className="h-4 w-20 bg-[var(--bg-surface)] rounded mx-auto mb-2" />
        <div className="h-10 w-64 bg-[var(--bg-surface)] rounded mx-auto mb-3" />
        <div className="h-12 w-full max-w-md bg-[var(--bg-surface)] rounded mx-auto" />
      </div>
      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="aspect-[4/5] bg-[var(--bg-surface)] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export function FeaturesSkeleton() {
  return (
    <div className="w-full mt-20 sm:mt-24 py-10 animate-pulse">
      <div className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-[var(--bg-surface)] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function FAQSkeleton() {
  return (
    <div className="w-full py-12 sm:py-20 animate-pulse">
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded mx-auto mb-10" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-[var(--bg-surface)] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
