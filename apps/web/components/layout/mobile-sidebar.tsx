'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { NavItem } from '@/lib/navigation';
import { SidebarNav } from './sidebar-nav';

export function MobileSidebar({ items }: { items: NavItem[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarNav items={items} />
      </SheetContent>
    </Sheet>
  );
}
