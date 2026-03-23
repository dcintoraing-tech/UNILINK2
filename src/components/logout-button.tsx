"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    // Clear local session info
    sessionStorage.removeItem('unilink-user');
    // Sign out from Firebase
    await signOut(auth);
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
