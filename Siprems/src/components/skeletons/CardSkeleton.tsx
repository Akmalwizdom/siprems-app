import { Skeleton } from '../ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function CardSkeleton() {
  return (
    <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">
          <Skeleton className="h-4 w-24" />
        </CardTitle>
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mt-1" />
        <Skeleton className="h-3 w-32 mt-4" />
      </CardContent>
    </Card>
  );
}
