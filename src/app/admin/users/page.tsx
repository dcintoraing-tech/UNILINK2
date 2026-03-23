
"use client";

import { useState, useMemo } from 'react';
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
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';


type UserRole = 'Docente' | 'Admin';
type UserStatus = 'Activo' | 'Inactivo';

interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Es opcional para no mostrarlo siempre
    role: UserRole;
    status: UserStatus;
    createdAt: string;
}

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = Object.fromEntries(formData.entries()) as any;
    
    if (userData.password || !editingUser) {
        if (userData.password !== userData.confirmPassword) {
            toast({
                variant: "destructive",
                title: "Error de contraseña",
                description: "Las contraseñas no coinciden.",
            });
            return;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...userToSave } = userData;

    if (editingUser) {
      const docRef = doc(firestore, 'users', editingUser.id);
      const dataToUpdate: Partial<User> = { ...userToSave };
      if (!userToSave.password) {
        delete dataToUpdate.password;
      }
      await updateDoc(docRef, dataToUpdate);
      toast({ title: "Usuario actualizado", description: `El usuario ${userToSave.name} ha sido actualizado.` });
    } else {
      const newUser: Omit<User, 'id'> = {
        ...userToSave,
        status: 'Activo',
        createdAt: new Date().toISOString().split('T')[0],
      };
      await addDoc(collection(firestore, 'users'), newUser);
      toast({ title: "Usuario creado", description: `El usuario ${userToSave.name} ha sido creado.` });
    }
    
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteDoc(doc(firestore, 'users', userId));
    toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado correctamente." });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>
                  Crea, edita y elimina usuarios de tipo Docente y Admin.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button size="sm" onClick={openCreateDialog}>
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Crear Usuario
                      </span>
                  </Button>
              </div>
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
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Cargando usuarios...</TableCell></TableRow>}
              {users?.map((user) => (
                  <TableRow key={user.id}>
                      <TableCell className="font-medium">
                          <div>{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                          <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(event) => event.preventDefault()}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    Eliminar
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario.
                                    </AlertDialogDescription>
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
            Mostrando <strong>{users?.length || 0}</strong> de <strong>{users?.length || 0}</strong> usuarios
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
            <DialogDescription>
                {editingUser ? 'Actualiza los detalles del usuario.' : 'Rellena los campos para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={editingUser?.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" name="email" type="email" defaultValue={editingUser?.email} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                    <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder={editingUser ? "Dejar en blanco para no cambiar" : ""} 
                        required={!editingUser} 
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                    </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                    <Input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Repetir contraseña" 
                        required={!editingUser}
                    />
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                    </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" defaultValue={editingUser?.role || 'Docente'}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Docente">Docente</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select name="status" defaultValue={editingUser?.status}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Activo">Activo</SelectItem>
                            <SelectItem value="Inactivo">Inactivo</SelectItem>
                        </SelectContent>
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

    