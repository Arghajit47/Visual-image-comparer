
import ImageComparerLoader from '@/components/ImageComparerLoader';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-10 mt-4">
          <h1 className="text-5xl font-bold text-primary tracking-tight">
            DiffLens
          </h1>
          <p className="text-xl text-muted-foreground mt-3 max-w-2xl mx-auto">
            Visually compare two images from URLs/Files and instantly see the percentage of difference, along with a generated diff image.
          </p>
        </header>
        <ImageComparerLoader />
         <footer className="text-center mt-12 py-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Powered by Next.js & Resemble.js. Designed with precision.
          </p>
        </footer>
      </div>
    </main>
  );
}
