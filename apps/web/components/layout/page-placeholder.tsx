import { PageTitle } from './page-title';

export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <PageTitle>{title}</PageTitle>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
