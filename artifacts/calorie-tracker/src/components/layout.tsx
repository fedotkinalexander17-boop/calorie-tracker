import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Utensils, LayoutDashboard, Database, Target, Apple, Globe, LogOut, HeartPulse } from "lucide-react";
import { ProStatusBadge } from "@/components/pro-status-badge";
import { Button } from "@/components/ui/button";
import { type PropsWithChildren } from "react";
import { useT } from "@/lib/i18n";
import { useClerk } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const { t, toggleLang } = useT();
  const { user, signOut } = useClerk();

  const bottomNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/log", icon: Utensils, label: t.nav.dailyLog },
    { href: "/wellness", icon: HeartPulse, label: t.nav.wellness },
    { href: "/foods", icon: Database, label: t.nav.foodLibrary },
    { href: "/goals", icon: Target, label: t.nav.myGoals },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r-border/50">
          <SidebarHeader className="p-4 flex flex-row items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Apple className="w-6 h-6" />
            </div>
            <span className="font-serif text-xl font-medium tracking-tight text-foreground">{t.appName}</span>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t.nav.overview}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        <span>{t.nav.dashboard}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/log"}>
                      <Link href="/log">
                        <Utensils className="w-4 h-4 mr-2" />
                        <span>{t.nav.dailyLog}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/wellness"}>
                      <Link href="/wellness">
                        <HeartPulse className="w-4 h-4 mr-2" />
                        <span>{t.nav.wellness}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t.nav.libraryGoals}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/foods"}>
                      <Link href="/foods">
                        <Database className="w-4 h-4 mr-2" />
                        <span>{t.nav.foodLibrary}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/goals"}>
                      <Link href="/goals">
                        <Target className="w-4 h-4 mr-2" />
                        <span>{t.nav.myGoals}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/40 space-y-1">
            {user && (
              <div className="px-2 py-1.5 mb-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.fullName || user.username || user.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
                <ProStatusBadge className="mt-1.5" />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={toggleLang}
            >
              <Globe className="w-4 h-4" />
              {t.nav.switchLang}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut className="w-4 h-4" />
              {t.signOut}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-20 shrink-0">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                <Apple className="w-4 h-4" />
              </div>
              <span className="font-serif text-lg font-medium tracking-tight text-foreground">{t.appName}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto w-full">{children}</div>
          </div>

          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/40 z-20">
            <div className="flex items-stretch justify-around h-16 safe-area-pb">
              {bottomNavItems.map(({ href, icon: Icon, label }) => {
                const active = location === href;
                return (
                  <Link href={href} key={href} className="flex-1">
                    <div className={cn(
                      "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}>
                      <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                      <span className="text-[10px] font-medium leading-none">{label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </main>
      </div>
    </SidebarProvider>
  );
}