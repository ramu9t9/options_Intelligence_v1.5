import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

function OptionChainSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-12" />
          ))}
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

function PatternAnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
          <Skeleton className="h-24" />
        </div>
      ))}
    </div>
  );
}

function StrategyListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[60px]" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-8 w-[80px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  OptionChainSkeleton, 
  DashboardSkeleton, 
  PatternAnalysisSkeleton, 
  StrategyListSkeleton 
};