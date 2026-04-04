"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function JefeLogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('unilink-jefe-user');
    router.push("/login");
  };

  return (
    <Button variant="ghost" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      <span>Cerrar sesión</span>
    </Button>
  );
}
