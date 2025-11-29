import { Hammer } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Hammer className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Tile Smith</h1>
            <p className="text-xs text-muted-foreground">Backend Data Layer</p>
          </div>
        </div>
      </div>
    </header>
  );
}
