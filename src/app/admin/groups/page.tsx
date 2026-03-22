"use client";

import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
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

// Interfaces for our data structures
interface CatalogItem {
    id: string;
    name: string;
}
interface User {
    id: string;
    name: string;
    role: 'Docente' | 'Admin';
}
interface Group {
    id: string;
    name: string;
    carreraId: string;
    cuatrimestreId: string;
    turnoId: string;
    docenteId: string;
}

// Storage keys
const GROUPS_STORAGE_KEY = 'unilink-groups';
const USERS_STORAGE_KEY = 'unilink-users';
const CATALOG_STORAGE_KEYS = {
    carreras: 'unilink-carreras',
    cuatrimestres: 'unilink-cuatrimestres',
    turnos: 'unilink-turnos',
};

export default function GroupsPage() {
  // State for all our data
  const [groups, setGroups] = useState<Group[]>([]);
  const [docentes, setDocentes] = useState<User[]>([]);
  const [carreras, setCarreras] = useState<CatalogItem[]>([]);
  const [cuatrimestres, setCuatrimestres] = useState<CatalogItem[]>([]);
  const [turnos, setTurnos] = useState<CatalogItem[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { toast } = useToast();
  
  // Load data from localStorage on component mount
  useEffect(() => {
    const loadData = (key: string, setter: Function, defaultValue: any[] = []) => {
        try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
                setter(JSON.parse(storedData));
            } else {
                setter(defaultValue);
            }
        } catch (error) {
            console.error(`Failed to load ${key} from localStorage`, error);
            setter(defaultValue);
        }
    };

    loadData(GROUPS_STORAGE_KEY, setGroups);
    loadData(CATALOG_STORAGE_KEYS.carreras, setCarreras);
    loadData(CATALOG_STORAGE_KEYS.cuatrimestres, setCuatrimestres);
    loadData(CATALOG_STORAGE_KEYS.turnos, setTurnos);
    
    // Load users and filter for 'Docente'
    try {
        const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (storedUsers) {
            const allUsers: User[] = JSON.parse(storedUsers);
            setDocentes(allUsers.filter(user => user.role === 'Docente'));
        }
    } catch (error) {
        console.error("Failed to load users from localStorage", error);
    }
  }, []);

  // Persist groups to localStorage whenever they change
  useEffect(() => {
      try {
        if(groups.length > 0) {
            localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
        }
      } catch (error) {
        console.error("Failed to save groups to localStorage:", error);
      }
  }, [groups]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const groupData = Object.fromEntries(formData.entries()) as Omit<Group, 'id'>;

    if (!groupData.name || !groupData.carreraId || !groupData.cuatrimestreId || !groupData.turnoId || !groupData.docenteId) {
        toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, rellena todos los campos.' });
        return;
    }

    if (editingGroup) {
      // Edit group
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...editingGroup, ...groupData } : g));
      toast({ title: "Grupo actualizado", description: `El grupo ${groupData.name} ha sido actualizado.` });
    } else {
      // Create group
      const newGroup: Group = {
        id: Date.now().toString(),
        ...groupData
      };
      setGroups([...groups, newGroup]);
      toast({ title: "Grupo creado", description: `El grupo ${groupData.name} ha sido creado.` });
    }
    
    setIsDialogOpen(false);
    setEditingGroup(null);
  };

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingGroup(null);
    setIsDialogOpen(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    toast({ title: "Grupo eliminado", description: "El grupo ha sido eliminado correctamente." });
  };
  
  const getNameById = (id: string, items: CatalogItem[] | User[]) => items.find(item => item.id === id)?.name || 'N/A';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle>Gestión de Grupos</CardTitle>
                  <CardDescription>
                  Crea grupos, asigna materias y docentes.
                  </CardDescription>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                  <PlusCircle className="h-3.5 w-3.5 mr-2" />
                  Crear Grupo
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Grupo</TableHead>
                <TableHead>Carrera</TableHead>
                <TableHead>Cuatrimestre</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Docente Asignado</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                  <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{getNameById(group.carreraId, carreras)}</TableCell>
                      <TableCell>{getNameById(group.cuatrimestreId, cuatrimestres)}</TableCell>
                      <TableCell>{getNameById(group.turnoId, turnos)}</TableCell>
                      <TableCell>{getNameById(group.docenteId, docentes)}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(group)}>Editar</DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
            Mostrando <strong>{groups.length}</strong> de <strong>{groups.length}</strong> grupos
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Crear Grupo'}</DialogTitle>
            <DialogDescription>{editingGroup ? 'Actualiza los detalles del grupo.' : 'Rellena los campos para crear un nuevo grupo.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Grupo</Label>
                <Input id="name" name="name" defaultValue={editingGroup?.name} required placeholder="Ej. IS-101A" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="carreraId">Carrera</Label>
                <Select name="carreraId" defaultValue={editingGroup?.carreraId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger>
                  <SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cuatrimestreId">Cuatrimestre</Label>
                <Select name="cuatrimestreId" defaultValue={editingGroup?.cuatrimestreId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger>
                  <SelectContent>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="turnoId">Turno</Label>
                <Select name="turnoId" defaultValue={editingGroup?.turnoId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un turno" /></SelectTrigger>
                  <SelectContent>{turnos.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="docenteId">Docente</Label>
                <Select name="docenteId" defaultValue={editingGroup?.docenteId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger>
                  <SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
