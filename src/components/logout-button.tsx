"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear local session info
    sessionStorage.removeItem('unilink-user');
    // Redirect to login page
    router.push("/login");
  };

  return (
    <Button variant="ghost" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      <span>Cerrar sesión</span>
    </Button>
  );
}
