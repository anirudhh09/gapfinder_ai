"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, CalendarCheck, FileUp, LayoutDashboard, ListChecks, LogOut, Menu, MessageSquareText, Network, X,
} from "lucide-react";
import Logo from "./Logo";
import { createClient } from "@/lib/db/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Materials", icon: FileUp },
  { href: "/topics", label: "Topic Map", icon: Network },
  { href: "/quiz", label: "Diagnostic Quiz", icon: ListChecks },
  { href: "/report", label: "Gap Report", icon: BarChart3 },
  { href: "/plan", label: "Revision Plan", icon: CalendarCheck },
  { href: "/assistant", label: "Assistant", icon: MessageSquareText },
];

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [path]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Link href="/dashboard"><Logo /></Link></div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold uppercase text-indigo-700">{email[0]}</span>
          <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{email}</p>
        </div>
        <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white md:block">{sidebar}</aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-slate-100"><Menu size={22} /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1 hover:bg-slate-100"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}
