
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ImageComparerLoading = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 border rounded-lg shadow-lg">
      <div>
        <Skeleton className="h-6 w-1/4 mb-2" />
        <Skeleton className="w-full" />
      </div>
      <div>
        <Skeleton className="h-6 w-1/4 mb-2" />
        <Skeleton className="w-full" />
      </div>
      <div className="md:col-span-2">
        <Skeleton className="w-full md:w-40" />
      </div>
    </div>
    <div className="text-center">
      <Skeleton className="h-8 w-1/3 mx-auto mb-2" />
      <Skeleton className="h-6 w-1/4 mx-auto" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg shadow-md">
          <div className="p-6 border-b">
            <Skeleton className="h-7 w-1/2" />
          </div>
          <div className="p-6 aspect-[4/3] bg-muted rounded-b-lg">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ImageComparer = dynamic(() => import('@/components/ImageComparer'), {
  ssr: false,
  loading: () => <ImageComparerLoading />,
});

export default function ImageComparerLoader() {
  return <ImageComparer />;
}
