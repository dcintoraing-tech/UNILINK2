
"use client";

import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type UserRole = 'Docente' | 'Admin';
type UserStatus = 'Activo' | 'Inactivo';

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
}

const useLocalStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                setStoredValue(item ? JSON.parse(item) : initialValue);
            } catch (error) {
                console.log(error);
                setStoredValue(initialValue);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.log(error);
        }
    };

    return [storedValue, setValue] as const;
};


export default function UsersPage() {
  const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = Object.fromEntries(formData.entries()) as any;
    
    if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
        toast({ title: "Usuario actualizado", description: `El usuario ${userData.name} ha sido actualizado.` });
    } else {
        const newUser: User = {
            id: new Date().toISOString(),
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: 'Activo',
            createdAt: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
        toast({ title: "Usuario creado", description: `El usuario ${userData.name} ha sido creado. La contraseña por defecto es 'password'` });
    }
    
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado." });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>Crea, edita y elimina usuarios de tipo Docente y Admin.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Crear Usuario</span>
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado el</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                  <TableRow key={user.id}>
                      <TableCell className="font-medium">
                          <div>{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell><Badge variant={user.status === 'Activo' ? 'default' : 'secondary'}>{user.status}</Badge></TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{users.length}</strong> de <strong>{users.length}</strong> usuarios
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Actualiza los detalles del usuario.' : 'Rellena los campos para crear un nuevo usuario.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={editingUser?.name} required /></div>
              <div className="grid gap-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" name="email" type="email" defaultValue={editingUser?.email} required /></div>
              {!editingUser && (<p className="text-sm text-muted-foreground">La contraseña inicial para los nuevos usuarios es 'password'. El usuario podrá cambiarla más tarde.</p>)}
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" defaultValue={editingUser?.role || 'Docente'}>
                  <SelectTrigger id="role"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                  <SelectContent><SelectItem value="Docente">Docente</SelectItem><SelectItem value="Admin">Admin</SelectItem></SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select name="status" defaultValue={editingUser?.status}>
                        <SelectTrigger id="status"><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                        <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
                    </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
