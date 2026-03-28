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

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        if (typeof window === 'undefined') {
            console.warn(`Tried setting localStorage key “${key}” even though environment is not a client`);
            return;
        }
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };
    
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.error(`Error parsing new value for localStorage key “${key}”:`, error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue];
};

interface Student {
    id: string;
    matricula: string;
    name: string;
    grupoId: string;
}

interface Grupo {
    id: string;
    name: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useLocalStorage<Student[]>('unilink-students', []);
  const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData = Object.fromEntries(formData.entries()) as { matricula: string; name: string; grupoId: string; };
    
    if (!studentData.matricula || !studentData.name || !studentData.grupoId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Todos los campos son obligatorios.",
        });
        return;
    }

    if (editingStudent) {
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...editingStudent, ...studentData } : s));
        toast({ title: "Alumno actualizado", description: `El alumno ${studentData.name} ha sido actualizado.` });
    } else {
        if (students.some(s => s.matricula === studentData.matricula)) {
             toast({
                variant: "destructive",
                title: "Error",
                description: "La matrícula ya existe.",
            });
            return;
        }
        const newStudent: Student = {
            id: new Date().toISOString(),
            ...studentData,
        };
        setStudents(prev => [...prev, newStudent]);
        toast({ title: "Alumno creado", description: `El alumno ${studentData.name} ha sido dado de alta.` });
    }
    
    setIsDialogOpen(false);
    setEditingStudent(null);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingStudent(null);
    setIsDialogOpen(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    toast({ title: "Alumno eliminado", description: "El alumno ha sido eliminado." });
  };
  
  const getGroupName = (grupoId: string) => {
      return grupos.find(g => g.id === grupoId)?.name || 'Sin grupo';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle>Gestión de Alumnos</CardTitle>
                  <CardDescription>Da de alta, edita y asigna grupos a los alumnos.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Dar de Alta Alumno</span>
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Grupo Asignado</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                  <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.matricula}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{getGroupName(student.grupoId)}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(student)}>Editar</DropdownMenuItem>
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción no se puede deshacer y eliminará al alumno permanentemente.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No hay alumnos registrados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{students.length}</strong> de <strong>{students.length}</strong> alumnos
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Editar Alumno' : 'Dar de Alta Alumno'}</DialogTitle>
            <DialogDescription>{editingStudent ? 'Actualiza los detalles del alumno.' : 'Rellena los campos para registrar un nuevo alumno.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="matricula">Matrícula</Label><Input id="matricula" name="matricula" defaultValue={editingStudent?.matricula} required /></div>
              <div className="grid gap-2"><Label htmlFor="name">Nombre Completo</Label><Input id="name" name="name" defaultValue={editingStudent?.name} required /></div>
              <div className="grid gap-2">
                <Label htmlFor="grupoId">Grupo</Label>
                <Select name="grupoId" defaultValue={editingStudent?.grupoId}>
                  <SelectTrigger id="grupoId"><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                  <SelectContent>
                    {grupos.length > 0 ? (
                        grupos.map(grupo => <SelectItem key={grupo.id} value={grupo.id}>{grupo.name}</SelectItem>)
                    ) : (
                        <SelectItem value="-" disabled>No hay grupos creados</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingStudent ? 'Guardar Cambios' : 'Dar de Alta'}</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
