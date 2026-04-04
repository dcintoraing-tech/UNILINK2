"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


// --- DATA PERSISTENCE HOOK ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                setStoredValue(item ? JSON.parse(item) : initialValue);
            } catch (error) {
                console.error(`Error reading localStorage key “${key}”:`, error);
                setStoredValue(initialValue);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

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

// --- INTERFACES ---
interface CatalogItem {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'Docente' | 'Admin';
    status: 'Activo' | 'Inactivo';
    createdAt: string;
}

interface Grupo extends CatalogItem {
    carreraId: string;
    cuatrimestre: string;
    semestre: string;
    turno: string;
}

interface AsignacionMateria {
    id: string;
    materia: string;
    carreraId: string;
}

interface HorarioBlock {
    docenteId: string;
    materiaAsignacionId: string;
    horaInicio: string;
    duracion: string; // "1" or "2"
}

interface Horario {
    id: string;
    grupoId: string;
    dia: string;
    aula: string;
    blocks: (HorarioBlock | undefined)[];
}

// --- GENERIC CATALOG COMPONENT ---
function CatalogContent({ title, items, setItems, onAdd, onEdit, onDelete }: { title: string, items: CatalogItem[], setItems: (value: CatalogItem[] | ((val: CatalogItem[]) => CatalogItem[])) => void, onAdd?: (name: string) => void, onEdit?: (id: string, name: string) => void, onDelete?: (id: string) => void }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<CatalogItem | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        if (!name) return;

        if (currentItem) {
            if (onEdit) onEdit(currentItem.id, name);
            else setItems(prev => prev.map(item => item.id === currentItem.id ? { ...item, name } : item));
            toast({ title: "Elemento actualizado" });
        } else {
            if (onAdd) onAdd(name);
            else setItems(prev => [...prev, { id: new Date().toISOString(), name }]);
            toast({ title: "Elemento agregado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const handleOpenDialog = (item: CatalogItem | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (itemId: string) => {
        if (onDelete) onDelete(itemId);
        else setItems(prev => prev.filter(item => item.id !== itemId));
        toast({ title: "Elemento eliminado" });
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()}> <PlusCircle className="h-4 w-4 mr-2" /> Agregar </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(item)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent>
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} {title}</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

// --- COMPONENTES DE GESTIÓN ---

function GruposContent({ grupos, setGrupos, carreras }: { grupos: Grupo[], setGrupos: (value: Grupo[] | ((val: Grupo[]) => Grupo[])) => void, carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Grupo | null>(null);
    const { toast } = useToast();

    const cuatrimestres = Array.from({ length: 9 }, (_, i) => `${i + 1}`);
    const semestres = Array.from({ length: 9 }, (_, i) => `${i + 1}`);
    const turnos = ["Matutino", "Vespertino", "Nocturno"];

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const carreraId = formData.get('carreraId') as string;
        const cuatrimestre = formData.get('cuatrimestre') as string;
        const semestre = formData.get('semestre') as string;
        const turno = formData.get('turno') as string;

        if (!name || !carreraId || !cuatrimestre || !semestre || !turno) return;

        if (currentItem) {
            setGrupos(prev => prev.map(item => item.id === currentItem.id ? { ...item, name, carreraId, cuatrimestre, semestre, turno } : item));
            toast({ title: "Grupo actualizado" });
        } else {
            setGrupos(prev => [...prev, { id: new Date().toISOString(), name, carreraId, cuatrimestre, semestre, turno }]);
            toast({ title: "Grupo agregado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const handleOpenDialog = (item: Grupo | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (itemId: string) => {
        setGrupos(prev => prev.filter(item => item.id !== itemId));
        toast({ title: "Grupo eliminado" });
    };
    
    const getCarreraName = (carreraId: string) => {
        return carreras.find(c => c.id === carreraId)?.name || 'N/A';
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Grupos</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()} disabled={carreras.length === 0}>
                     <PlusCircle className="h-4 w-4 mr-2" /> Agregar Grupo
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Carrera</TableHead><TableHead>Cuatrimestre</TableHead><TableHead>Semestre</TableHead><TableHead>Turno</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {grupos.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{getCarreraName(item.carreraId)}</TableCell>
                                <TableCell>{item.cuatrimestre}</TableCell>
                                <TableCell>{item.semestre}</TableCell>
                                <TableCell>{item.turno}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(item)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {carreras.length === 0 && <p className="text-sm text-muted-foreground mt-4">Crea una carrera antes de agregar un grupo.</p>}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent>
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} Grupo</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                    <div className="grid gap-2">
                        <Label htmlFor="carreraId">Carrera</Label>
                        <Select name="carreraId" defaultValue={currentItem?.carreraId} required>
                            <SelectTrigger id="carreraId"><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger>
                            <SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="cuatrimestre">Cuatrimestre</Label>
                        <Select name="cuatrimestre" defaultValue={currentItem?.cuatrimestre || "NONE"} required>
                            <SelectTrigger id="cuatrimestre"><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Ninguno</SelectItem>
                                {cuatrimestres.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="semestre">Semestre</Label>
                        <Select name="semestre" defaultValue={currentItem?.semestre || "NONE"} required>
                            <SelectTrigger id="semestre"><SelectValue placeholder="Selecciona un semestre" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Ninguno</SelectItem>
                                {semestres.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="turno">Turno</Label>
                        <Select name="turno" defaultValue={currentItem?.turno} required>
                            <SelectTrigger id="turno"><SelectValue placeholder="Selecciona un turno" /></SelectTrigger>
                            <SelectContent>{turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}


function MateriasContent({ asignaciones, setAsignaciones, carreras }: { asignaciones: AsignacionMateria[], setAsignaciones: (value: AsignacionMateria[] | ((val: AsignacionMateria[]) => AsignacionMateria[])) => void, carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const materia = formData.get('materia') as string;
        let carreraId = formData.get('carreraId') as string;

        if (carreraId === 'NONE') {
            carreraId = '';
        }

        if (!materia) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Debes completar el nombre de la materia.",
            });
            return;
        }

        const newAsignacion = { materia, carreraId };

        if (currentItem) {
            setAsignaciones(prev => prev.map(a => a.id === currentItem.id ? { ...a, ...newAsignacion } : a));
            toast({ title: "Asignación actualizada" });
        } else {
            setAsignaciones(prev => [...prev, { id: new Date().toISOString(), ...newAsignacion }]);
            toast({ title: "Materia asignada" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const openDialog = (item: AsignacionMateria | null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (itemId: string) => {
        setAsignaciones(prev => prev.filter(a => a.id !== itemId));
        toast({ title: "Asignación eliminada" });
    };

    const getNameById = (id: string | undefined, list: CatalogItem[]) => {
        if (!id) return 'N/A';
        return list.find(item => item.id === id)?.name || 'N/A';
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Asignación de Materias</CardTitle>
                <Button size="sm" onClick={() => openDialog(null)}><PlusCircle className="h-4 w-4 mr-2" />Asignar Materia</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead>Carrera</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {asignaciones.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.materia}</TableCell>
                                <TableCell>{getNameById(a.carreraId, carreras)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openDialog(a)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent>
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Asignar'} Materia</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="materia">Nombre de la Materia</Label><Input id="materia" name="materia" defaultValue={currentItem?.materia} required /></div>
                    <div className="grid gap-2">
                        <Label>Carrera</Label>
                        <Select name="carreraId" defaultValue={currentItem?.carreraId || 'NONE'} required>
                            <SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Ninguna</SelectItem>
                                {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes, carreras }: { horarios: Horario[], setHorarios: (value: Horario[] | ((val: Horario[]) => Horario[])) => void, grupos: Grupo[], materias: AsignacionMateria[], docentes: User[], carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Horario | null>(null);
    const { toast } = useToast();

    const calculateEndTime = (startTime: string, duration: number): string => {
        if (!startTime || !duration) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        date.setHours(date.getHours() + duration);
        return date.toTimeString().slice(0, 5);
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const grupoId = formData.get('grupoId') as string;
        const dia = formData.get('dia') as string;
        const aula = formData.get('aula') as string;

        if (!grupoId || !dia || !aula) {
            toast({ variant: 'destructive', title: "Error", description: "Grupo, Día y Aula son obligatorios." });
            return;
        }

        const blocks: (HorarioBlock | undefined)[] = [];
        let hasAtLeastOneBlock = false;
        for (let i = 0; i < 4; i++) {
            const docenteId = formData.get(`docenteId-${i}`) as string;
            const materiaAsignacionId = formData.get(`materiaAsignacionId-${i}`) as string;
            const horaInicio = formData.get(`horaInicio-${i}`) as string;
            const duracion = formData.get(`duracion-${i}`) as string;

            if (docenteId && materiaAsignacionId && horaInicio && duracion) {
                blocks.push({ docenteId, materiaAsignacionId, horaInicio, duracion });
                hasAtLeastOneBlock = true;
            } else if (docenteId || materiaAsignacionId || horaInicio || duracion) {
                toast({ variant: 'destructive', title: `Error en Bloque ${i+1}`, description: "Para cada bloque, debes completar todos los campos." });
                return;
            }
            else {
                blocks.push(undefined);
            }
        }

        if (!hasAtLeastOneBlock) {
            toast({ variant: 'destructive', title: "Error", description: "Debes definir al menos un bloque de horario completo." });
            return;
        }
        
        const newHorarioData = {
            grupoId,
            dia,
            aula,
            blocks
        };

        if (currentItem) {
            setHorarios(prev => prev.map(h => h.id === currentItem.id ? { ...h, ...newHorarioData } : h));
            toast({ title: "Horario actualizado" });
        } else {
            setHorarios(prev => [...prev, { ...newHorarioData, id: new Date().toISOString() }]);
            toast({ title: "Horario creado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };
    
    const openDialog = (item: Horario | null) => { setCurrentItem(item); setIsDialogOpen(true); };
    const handleDelete = (itemId: string) => { setHorarios(prev => prev.filter(h => h.id !== itemId)); toast({ title: "Horario eliminado" }); };
    
    const getNameById = (id: string, list: { id: string, name: string }[]) => list.find(item => item.id === id)?.name || 'N/A';
    const getMateriaName = (id: string) => materias.find(m => m.id === id)?.materia || 'N/A';
    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Gestión de Horarios</CardTitle>
                <Button size="sm" onClick={() => openDialog(null)}><PlusCircle className="h-4 w-4 mr-2" />Crear Horario</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Día</TableHead><TableHead>Aula</TableHead><TableHead>Bloques del Horario</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {horarios.map(h => (
                            <TableRow key={h.id}>
                                <TableCell>{getNameById(h.grupoId, grupos)}</TableCell>
                                <TableCell>{h.dia}</TableCell>
                                <TableCell>{h.aula}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                    {h.blocks.map((block, index) => {
                                        if (!block) return null;
                                        const endTime = calculateEndTime(block.horaInicio, parseInt(block.duracion));
                                        return (
                                            <div key={index} className="text-xs p-2 rounded-md bg-muted border">
                                                <div className="font-bold text-foreground">Bloque {index + 1}: {block.horaInicio} - {endTime} ({block.duracion}h)</div>
                                                <div className="font-semibold">{getMateriaName(block.materiaAsignacionId)}</div>
                                                <div className="text-muted-foreground">{getNameById(block.docenteId, docentes)}</div>
                                            </div>
                                        )
                                    })}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openDialog(h)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(h.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Crear'} Horario</DialogTitle></DialogHeader>
                    <form id="horario-form" onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="grid gap-2"><Label>Grupo</Label><Select name="grupoId" defaultValue={currentItem?.grupoId} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="grid gap-2"><Label>Día</Label><Select name="dia" defaultValue={currentItem?.dia} required><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{diasSemana.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                            <div className="grid gap-2"><Label htmlFor="aula">Aula</Label><Input id="aula" name="aula" defaultValue={currentItem?.aula} required /></div>
                        </div>

                        <Separator />
                        <p className="font-medium">Bloques del Horario</p>
                        
                        <ScrollArea className="h-72 pr-3">
                            <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="grid gap-4 border p-4 rounded-lg bg-muted/50">
                                    <h4 className="font-semibold">Bloque {i + 1}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`materiaAsignacionId-${i}`}>Materia</Label>
                                            <Select name={`materiaAsignacionId-${i}`} defaultValue={currentItem?.blocks?.[i]?.materiaAsignacionId}>
                                                <SelectTrigger id={`materiaAsignacionId-${i}`}><SelectValue placeholder="Selecciona una materia" /></SelectTrigger>
                                                <SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.materia} ({getNameById(m.carreraId, carreras)})</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`docenteId-${i}`}>Docente</Label>
                                            <Select name={`docenteId-${i}`} defaultValue={currentItem?.blocks?.[i]?.docenteId}>
                                                <SelectTrigger id={`docenteId-${i}`}><SelectValue placeholder="Selecciona un docente" /></SelectTrigger>
                                                <SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`horaInicio-${i}`}>Hora Inicio</Label>
                                            <Input id={`horaInicio-${i}`} name={`horaInicio-${i}`} type="time" defaultValue={currentItem?.blocks?.[i]?.horaInicio} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`duracion-${i}`}>Duración</Label>
                                            <Select name={`duracion-${i}`} defaultValue={currentItem?.blocks?.[i]?.duracion}>
                                                <SelectTrigger id={`duracion-${i}`}><SelectValue placeholder="Selecciona duración" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 hora</SelectItem>
                                                    <SelectItem value="2">2 horas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </form>
                     <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="horario-form">{currentItem ? 'Guardar Cambios' : 'Crear'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


export default function CatalogsPage() {
    const [carreras, setCarreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos, setGrupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [materiaAsignaciones, setMateriaAsignaciones] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [horarios, setHorarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);

    const docentes = useMemo(() => users.filter(u => u.role === 'Docente'), [users]);

    return (
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras"><CatalogContent title="Carreras" items={carreras} setItems={setCarreras} /></TabsContent>
            <TabsContent value="grupos"><GruposContent grupos={grupos} setGrupos={setGrupos} carreras={carreras} /></TabsContent>
            <TabsContent value="materias"><MateriasContent asignaciones={materiaAsignaciones} setAsignaciones={setMateriaAsignaciones} carreras={carreras} /></TabsContent>
            <TabsContent value="horarios"><HorariosContent horarios={horarios} setHorarios={setHorarios} grupos={grupos} materias={materiaAsignaciones} docentes={docentes} carreras={carreras} /></TabsContent>
        </Tabs>
    );
}
