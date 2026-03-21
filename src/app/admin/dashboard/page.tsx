import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { Users, Settings } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Welcome, Admin!</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <nav className="grid gap-4 text-sm text-muted-foreground">
            <a href="#" className="font-semibold text-primary flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </a>
            <a href="#" className="hover:text-primary flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </a>
          </nav>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>Manage your application from here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is the central hub for all administrative tasks.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
