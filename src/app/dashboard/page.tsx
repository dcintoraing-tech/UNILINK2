import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function DashboardPage() {
  const user = {
    name: "Alex Doe",
    email: "alex.doe@example.com",
    initials: "AD",
    plan: "Premium",
  };

  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <h1 className="text-xl font-semibold">UniLink Dashboard</h1>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Welcome, {user.name}!</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <nav className="grid gap-4 text-sm text-muted-foreground">
            <a href="#" className="font-semibold text-primary">
              Profile
            </a>
            <a href="#" className="hover:text-primary">Settings</a>
            <a href="#" className="hover:text-primary">Support</a>
          </nav>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Your Profile</CardTitle>
                <Badge variant="outline" className="border-accent text-accent">{user.plan}</Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-4 pt-4">
                <Avatar className="h-16 w-16">
                  {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={user.name} data-ai-hint={userAvatar.imageHint} />}
                  <AvatarFallback>{user.initials}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-lg font-medium leading-none">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>What's New</CardTitle>
                    <CardDescription>Latest updates and features from UniLink.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Welcome to the new and improved UniLink Access dashboard! We're excited to have you here.</p>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
