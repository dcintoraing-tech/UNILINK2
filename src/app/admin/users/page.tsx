
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';


type UserRole = 'Docente' | 'Admin' | 'Alumno' | 'Jefe de carrera';
type UserStatus = 'Activo' | 'Inactivo';

interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    carreraId?: string;
    status: UserStatus;
    createdAt: string;
}

interface CatalogItem {
    id: string;
    name: string;
}

export default function UsersPage() {
  const firestore = useFirestore();
  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore]);
  const { data: usersData, isLoading } = useCollection<User>(usersCollectionRef);
  const users = usersData || [];
  
  const carrerasCollectionRef = useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]);
  const { data: carrerasData } = useCollection<CatalogItem>(carrerasCollectionRef);
  const carreras = carrerasData || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormRole, setSelectedFormRole] = useState<UserRole | ''>('');


  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const userData = Object.fromEntries(formData.entries()) as any;
    
    if ((userData.role === 'Jefe de carrera' || userData.role === 'Docente') && !userData.carreraId) {
        toast({ variant: "destructive", title: "Campo requerido", description: "Debe seleccionar una carrera para el Jefe de Carrera o Docente." });
        return;
    }

    try {
        const userDocRef = doc(firestore, 'userProfiles', editingUser.id);

        const updatedData: Partial<User> = {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            carreraId: (userData.role === 'Jefe de carrera' || userData.role === 'Docente') ? userData.carreraId : undefined,
            status: userData.status,
        };

        await updateDoc(userDocRef, updatedData);

        toast({ title: "Usuario actualizado", description: `El usuario ${userData.name} ha sido actualizado.` });
        setIsDialogOpen(false);
        setEditingUser(null);
    } catch(error: any) {
        console.error("Error updating user: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el usuario." });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setSelectedFormRole(user.role);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
        await deleteDoc(doc(firestore, 'userProfiles', userId));
        toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado." });
    } catch(error: any) {
        console.error("Error deleting user: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
    }
  };
  
  const handleDownloadTemplate = () => {
    const headers = [['name', 'email', 'role', 'carreraId (solo para Jefe de carrera o Docente)']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_usuarios.xlsx");
    toast({ title: "Plantilla descargada", description: "El archivo de plantilla de Excel está listo." });
  };

  const handleExport = () => {
    const usersToExport = users.map(({ id, password, ...rest }) => rest);
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
    reader.onload = async (event) => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<any>(worksheet);

            const batch = writeBatch(firestore);
            let updatedCount = 0;
            let skippedCount = 0;
            
            for (const item of json) {
                const email = item.email ? String(item.email).trim().toLowerCase() : '';
                if (!email || !item.name || !item.role) {
                     toast({ variant: "destructive", title: "Dato faltante", description: `Registro para '${email || 'desconocido'}' está incompleto. Se omitirá.` });
                     skippedCount++;
                     continue;
                }
                
                const q = query(collection(firestore, 'userProfiles'), where('email', '==', email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const updatedData: any = {
                        name: item.name,
                        role: item.role,
                        status: 'Activo',
                    };
                    if (item.carreraId && (item.role === 'Jefe de carrera' || item.role === 'Docente')) {
                        updatedData.carreraId = item.carreraId;
                    }
                    batch.update(userDoc.ref, updatedData);
                    updatedCount++;
                } else {
                    // Not creating new users via import to avoid auth/profile mismatches
                    skippedCount++;
                }
            }

            if (updatedCount > 0) {
                 await batch.commit();
                 toast({ title: "Importación exitosa", description: `${updatedCount} usuarios actualizados. ${skippedCount} omitidos.` });
            } else {
                 toast({ title: "Importación finalizada", description: `No se actualizaron usuarios. ${skippedCount} omitidos.` });
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
  
  const getCarreraName = (carreraId?: string) => {
    if (!carreraId) return '';
    return carreras.find(c => c.id === carreraId)?.name || 'Desconocida';
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>Edita, importa y exporta usuarios. La creación de usuarios se realiza a través de la importación.</CardDescription>
              </div>
              <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                <Button size="sm" variant="outline" onClick={handleImportClick}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Importar
                </Button>
                <Button size="sm" variant="outline" onClick={handleExport} disabled={users.length === 0}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Plantilla
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
          {/* Mobile View */}
          <div className="grid gap-4 md:hidden">
            {users.map((user) => (
                <Card key={user.id}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold">{user.name}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rol</span>
                            <div className="text-right">
                                {user.role}
                                {(user.role === 'Jefe de carrera' || user.role === 'Docente') && user.carreraId && (
                                    <div className="text-xs text-muted-foreground">({getCarreraName(user.carreraId)})</div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Estado</span>
                            <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'}>{user.status}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Creado</span>
                            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>

          {/* Desktop View */}
          <Table className="hidden md:table">
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
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Cargando usuarios...</TableCell></TableRow>
              ) : users.map((user) => (
                  <TableRow key={user.id}>
                      <TableCell className="font-medium">
                          <div>{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        {user.role}
                        {(user.role === 'Jefe de carrera' || user.role === 'Docente') && user.carreraId && (
                            <div className="text-xs text-muted-foreground">({getCarreraName(user.carreraId)})</div>
                        )}
                      </TableCell>
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
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualiza los detalles del usuario.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={editingUser?.name} required /></div>
                    <div className="grid gap-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" name="email" type="email" defaultValue={editingUser?.email} required /></div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="role">Rol</Label>
                      <Select name="role" defaultValue={editingUser?.role} onValueChange={(value) => setSelectedFormRole(value as UserRole)}>
                        <SelectTrigger id="role"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Docente">Docente</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Alumno">Alumno</SelectItem>
                          <SelectItem value="Jefe de carrera">Jefe de carrera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(selectedFormRole === 'Jefe de carrera' || selectedFormRole === 'Docente') && (
                        <div className="grid gap-2">
                            <Label htmlFor="carreraId">Carrera / Área Académica</Label>
                            <Select name="carreraId" defaultValue={editingUser?.carreraId} required>
                                <SelectTrigger id="carreraId"><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger>
                                <SelectContent>
                                    {carreras.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    