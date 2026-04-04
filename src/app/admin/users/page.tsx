
"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, MoreHorizontal, Eye, EyeOff, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { ScrollArea } from '@/components/ui/scroll-area';

type UserRole = 'Docente' | 'Admin';
type UserStatus = 'Activo' | 'Inactivo';

interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
}

const useLocalStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.log(error);
            }
            setIsInitialized(true); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (!isInitialized || typeof window === 'undefined') return;
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
        } catch (error) {
            console.log(error);
        }
    };
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                 try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.log(error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);


    return [storedValue, setValue] as const;
};


export default function UsersPage() {
  const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const storedUsersRaw = window.localStorage.getItem('unilink-users');
    const currentUsers: User[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
    
    if (editingUser) {
        const emailExists = currentUsers.some(u => u.email === userData.email && u.id !== editingUser.id);
        if (emailExists) {
            toast({ variant: "destructive", title: "Error", description: "Un usuario con este correo electrónico ya existe." });
            return;
        }

        const updatedUsers = currentUsers.map(u => {
            if (u.id === editingUser.id) {
                const updatedUser: User = {
                    ...u,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    status: userData.status,
                };
                if (userData.password) {
                    updatedUser.password = userData.password;
                }
                return updatedUser;
            }
            return u;
        });
        setUsers(updatedUsers);
        toast({ title: "Usuario actualizado", description: `El usuario ${userData.name} ha sido actualizado.` });
    } else {
        const emailExists = currentUsers.some(u => u.email === userData.email);
        if (emailExists) {
            toast({ variant: "destructive", title: "Error", description: "Un usuario con este correo electrónico ya existe." });
            return;
        }

        const newUser: User = {
            id: new Date().toISOString(),
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            status: 'Activo',
            createdAt: new Date().toISOString(),
        };
        setUsers([...currentUsers, newUser]);
        toast({ title: "Usuario creado", description: `El usuario ${userData.name} ha sido creado.` });
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
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado." });
  };
  
  const handleDownloadTemplate = () => {
    const headers = [['name', 'email', 'password', 'role']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_usuarios.xlsx");
    toast({ title: "Plantilla descargada", description: "El archivo de plantilla de Excel está listo." });
  };

  const handleExport = () => {
    const usersToExport = users.map(({ id, password, createdAt, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(usersToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, "usuarios.xlsx");
    toast({ title: "Exportación exitosa", description: "La lista de usuarios ha sido descargada." });
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<any>(worksheet);

            const storedUsersRaw = window.localStorage.getItem('unilink-users');
            const currentUsers: User[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
            const existingEmails = new Set(currentUsers.map(u => u.email));

            const newUsers: User[] = [];
            let skippedCount = 0;

            for (const item of json) {
                if (!item.name || !item.email || !item.password || !item.role) {
                    toast({ variant: "destructive", title: "Dato faltante", description: `El registro para '${item.email || 'desconocido'}' está incompleto. Se omitirá.` });
                    continue;
                }
                if (existingEmails.has(item.email)) {
                    skippedCount++;
                    continue;
                }
                if (!['Docente', 'Admin'].includes(item.role)) {
                    toast({ variant: "destructive", title: "Rol inválido", description: `El rol '${item.role}' para '${item.email}' no es válido. Se omitirá.` });
                    continue;
                }

                newUsers.push({
                    id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
                    name: item.name,
                    email: item.email,
                    password: String(item.password),
                    role: item.role,
                    status: 'Activo',
                    createdAt: new Date().toISOString(),
                });
                existingEmails.add(item.email);
            }
            
            if (newUsers.length > 0) {
                 setUsers([...currentUsers, ...newUsers]);
                 toast({ title: "Importación exitosa", description: `${newUsers.length} nuevos usuarios agregados. ${skippedCount > 0 ? `${skippedCount} duplicados omitidos.` : ''}` });
            } else {
                 toast({ title: "Importación finalizada", description: `No se agregaron nuevos usuarios. ${skippedCount > 0 ? `${skippedCount} duplicados omitidos.` : ''}` });
            }

        } catch (error: any) {
            console.error("Error al importar el archivo:", error);
            toast({
                variant: "destructive",
                title: "Error de importación",
                description: error.message || "No se pudo procesar el archivo de Excel.",
            });
        } finally {
            if (e.target) e.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>Crea, edita, importa y exporta usuarios.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleImportClick}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Importar
                </Button>
                <Button size="sm" variant="outline" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Plantilla
                </Button>
                <Button size="sm" onClick={openCreateDialog}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Crear Usuario</span>
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".xlsx, .xls, .csv"
              className="hidden"
          />
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
          <form onSubmit={handleFormSubmit}>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={editingUser?.name} required /></div>
                    <div className="grid gap-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" name="email" type="email" defaultValue={editingUser?.email} required /></div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="password">{editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</Label>
                      <div className="relative">
                        <Input id="password" name="password" type={showPassword ? "text" : "password"} required={!editingUser} placeholder={editingUser ? "Dejar en blanco para no cambiar" : ""} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">{editingUser ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña'}</Label>
                      <div className="relative">
                        <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required={!editingUser} placeholder={editingUser ? "Dejar en blanco para no cambiar" : ""} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">{showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                        </Button>
                      </div>
                    </div>

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
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
