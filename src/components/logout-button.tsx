"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    
    sessionStorage.removeItem('unilink-user');
    sessionStorage.removeItem('unilink-active-role');
    sessionStorage.removeItem('unilink-student-id');
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
