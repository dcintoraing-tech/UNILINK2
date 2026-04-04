"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { Progress } from '@/components/ui/progress';


// --- DATA PERSISTENCE HOOK ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsInitialized(false);
            return;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
        } finally {
            setIsInitialized(true);
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (typeof window === 'undefined' || !isInitialized) return;
        
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
        if (typeof window === 'undefined') return;

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
    }, [key, isInitialized]);

    if (!isInitialized) {
        return [initialValue, () => {}];
    }

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
    cuatrimestre: string;
    semestre: string;
}

interface HorarioBlock {
    docenteId: string;
    materiaAsignacionId: string;
    horaInicio: string;
    duracion: string; // "1", "2", or "-1" for continuation
}

interface Horario {
    id: string;
    grupoId: string;
    dia: string;
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
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{title}</CardTitle>
                <Button className="w-full sm:w-auto" size="sm" onClick={() => handleOpenDialog()}> <PlusCircle className="h-4 w-4 mr-2" /> Agregar </Button>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} {title}</DialogTitle></DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                        <ScrollArea className="max-h-96 pr-4">
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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

        if (!name || !carreraId || !turno) return;
        
        if (cuatrimestre === "NONE" && semestre === "NONE") {
             toast({ variant: "destructive", title: "Error", description: "Debe seleccionar un cuatrimestre o un semestre." });
             return;
        }

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
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Grupos</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()} disabled={carreras.length === 0} className="w-full sm:w-auto">
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
                                <TableCell>{item.cuatrimestre === "NONE" ? "N/A" : item.cuatrimestre}</TableCell>
                                <TableCell>{item.semestre === "NONE" ? "N/A" : item.semestre}</TableCell>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} Grupo</DialogTitle></DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                        <ScrollArea className="max-h-96 pr-4">
                            <div className="grid gap-4 py-4">
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
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


function MateriasContent({ asignaciones, setAsignaciones, carreras }: { asignaciones: AsignacionMateria[], setAsignaciones: (value: AsignacionMateria[] | ((val: AsignacionMateria[]) => AsignacionMateria[])) => void, carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const { toast } = useToast();
    const [filterCarrera, setFilterCarrera] = useState('all');
    const [filterPeriodo, setFilterPeriodo] = useState('all');

    const cuatrimestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);
    const semestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);

    const filteredAsignaciones = useMemo(() => {
        return asignaciones.filter(a => {
            const carreraMatch = !filterCarrera || filterCarrera === 'all' || a.carreraId === filterCarrera;
            if (!filterPeriodo || filterPeriodo === 'all') return carreraMatch;

            const [type, value] = filterPeriodo.split('-');
            if (type === 'cuatri') return carreraMatch && a.cuatrimestre === value;
            if (type === 'sem') return carreraMatch && a.semestre === value;
            return carreraMatch;
        });
    }, [asignaciones, filterCarrera, filterPeriodo]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const materia = formData.get('materia') as string;
        const carreraId = formData.get('carreraId') as string;
        const cuatrimestre = formData.get('cuatrimestre') as string;
        const semestre = formData.get('semestre') as string;

        if (!materia || !carreraId) {
            toast({
                variant: 'destructive',
                title: "Campos requeridos",
                description: "Debes completar el nombre de la materia y seleccionar una carrera.",
            });
            return;
        }

        if (cuatrimestre === 'NONE' && semestre === 'NONE') {
            toast({
                variant: 'destructive',
                title: "Periodo requerido",
                description: "Debes seleccionar un cuatrimestre o un semestre.",
            });
            return;
        }

        const newAsignacion = { materia, carreraId, cuatrimestre, semestre };

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

    const getCarreraName = (id: string | undefined) => {
        if (!id) return 'N/A';
        return carreras.find(item => item.id === id)?.name || 'Carrera Desconocida';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Asignación de Materias</CardTitle>
                  <Button size="sm" onClick={() => openDialog(null)} disabled={carreras.length === 0} className="w-full sm:w-auto"><PlusCircle className="h-4 w-4 mr-2" />Asignar Materia</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por carrera..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las carreras</SelectItem>
                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por periodo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los periodos</SelectItem>
                            <Separator />
                            {cuatrimestres.map(c => <SelectItem key={`cuatri-${c}`} value={`cuatri-${c}`}>Cuatrimestre {c}</SelectItem>)}
                            <Separator />
                            {semestres.map(s => <SelectItem key={`sem-${s}`} value={`sem-${s}`}>Semestre {s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead>Carrera</TableHead>
                            <TableHead>Cuatrimestre</TableHead>
                            <TableHead>Semestre</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAsignaciones.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.materia}</TableCell>
                                <TableCell>{getCarreraName(a.carreraId)}</TableCell>
                                <TableCell>{a.cuatrimestre === "NONE" ? "N/A" : a.cuatrimestre}</TableCell>
                                <TableCell>{a.semestre === "NONE" ? "N/A" : a.semestre}</TableCell>
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
                {carreras.length === 0 && <p className="text-sm text-muted-foreground mt-4">Crea una carrera antes de asignar una materia.</p>}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Asignar'} Materia</DialogTitle></DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                        <ScrollArea className="max-h-96 pr-4">
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2"><Label htmlFor="materia">Nombre de la Materia</Label><Input id="materia" name="materia" defaultValue={currentItem?.materia} required /></div>
                                <div className="grid gap-2">
                                    <Label>Carrera</Label>
                                    <Select name="carreraId" defaultValue={currentItem?.carreraId} required>
                                        <SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger>
                                        <SelectContent>
                                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
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
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes, carreras }: { horarios: Horario[], setHorarios: (value: Horario[] | ((val: Horario[]) => Horario[])) => void, grupos: Grupo[], materias: AsignacionMateria[], docentes: User[], carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Grupo | null>(null);
    const [wizardData, setWizardData] = useState<Record<string, (HorarioBlock | undefined)[]>>({});
    const [wizardStep, setWizardStep] = useState({ diaIndex: 0, bloqueIndex: 0 });
    const { toast } = useToast();

    // Filters
    const [filterCarrera, setFilterCarrera] = useState('all');
    const [filterPeriodo, setFilterPeriodo] = useState('all');

    const diasSemana = useMemo(() => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], []);
    const bloques = useMemo(() => [0, 1, 2, 3], []); // 4 bloques por día
    const allSemestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);
    const allCuatrimestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);

    const docenteOptions = useMemo(() => docentes.map(d => ({ value: d.id, label: d.name })), [docentes]);
    const materiaOptions = useMemo(() => materias.map(m => ({ value: m.id, label: `${m.materia} (${carreras.find(c => c.id === m.carreraId)?.name || 'N/A'})` })), [materias, carreras]);

    const displayedGrupos = useMemo(() => {
        return grupos.filter(g => {
            const carreraMatch = !filterCarrera || filterCarrera === 'all' || g.carreraId === filterCarrera;
            if (!filterPeriodo || filterPeriodo === 'all') return carreraMatch;
            const [type, value] = filterPeriodo.split('-');
            return type === 'cuatri' ? carreraMatch && g.cuatrimestre === value : carreraMatch && g.semestre === value;
        });
    }, [grupos, filterCarrera, filterPeriodo]);

    const calculateEndTime = (startTime: string, duration: number): string => {
        if (!startTime || !duration) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        date.setHours(date.getHours() + duration);
        return date.toTimeString().slice(0, 5);
    };

    const getNameById = (id: string, list: { id: string, name: string }[]) => list.find(item => item.id === id)?.name || 'N/A';
    const getMateriaName = (id: string) => materias.find(m => m.id === id)?.materia || 'N/A';

    const openWizard = (group: Grupo | null) => {
        if (group) {
            setSelectedGroup(group);
            const existingSchedule = horarios.filter(h => h.grupoId === group.id);
            const scheduleByDay: Record<string, (HorarioBlock | undefined)[]> = {};
            diasSemana.forEach(dia => {
                const daySchedule = existingSchedule.find(h => h.dia === dia);
                const blocks = Array(bloques.length).fill(undefined);
                if (daySchedule) {
                    daySchedule.blocks.forEach((block, index) => {
                        if (index < bloques.length) blocks[index] = block;
                    });
                }
                scheduleByDay[dia] = blocks;
            });
            setWizardData(scheduleByDay);
        } else {
            setSelectedGroup(null);
            setWizardData({});
        }
        setWizardStep({ diaIndex: 0, bloqueIndex: 0 });
        setIsDialogOpen(true);
    };

    const handleDelete = (grupoId: string) => {
        setHorarios(prev => prev.filter(h => h.grupoId !== grupoId));
        toast({ title: "Horario eliminado" });
    };

    const isCurrentBlockValid = useMemo(() => {
        const { diaIndex, bloqueIndex } = wizardStep;
        const dia = diasSemana[diaIndex];
        const block = wizardData[dia]?.[bloqueIndex];

        if (!block) return true; // Empty is valid
        if (block.duracion === '-1') return true; // Continuation is valid

        const { docenteId, materiaAsignacionId, horaInicio, duracion } = block;
        const allFilled = docenteId && materiaAsignacionId && horaInicio && duracion;
        const allEmpty = !docenteId && !materiaAsignacionId && !horaInicio && !duracion;

        return allFilled || allEmpty;
    }, [wizardData, wizardStep, diasSemana]);

    const handleBlockDataChange = (field: keyof HorarioBlock, value: string) => {
        const { diaIndex, bloqueIndex } = wizardStep;
        const dia = diasSemana[diaIndex];

        setWizardData(prev => {
            const newWizardData = { ...prev };
            if (!newWizardData[dia]) newWizardData[dia] = Array(bloques.length).fill(undefined);
            
            const dayBlocks = [...newWizardData[dia]];
            const currentBlock: Partial<HorarioBlock> = dayBlocks[bloqueIndex] ? { ...dayBlocks[bloqueIndex] } : {};
            const oldDuration = currentBlock.duracion;

            currentBlock[field] = value;

            const nextBlockIndex = bloqueIndex + 1;
            if (field === 'duracion') {
                if (value === '2' && nextBlockIndex < dayBlocks.length) {
                    dayBlocks[nextBlockIndex] = { ...currentBlock, duracion: '-1' } as HorarioBlock;
                } else if (oldDuration === '2' && value !== '2' && nextBlockIndex < dayBlocks.length) {
                    if (dayBlocks[nextBlockIndex]?.duracion === '-1') dayBlocks[nextBlockIndex] = undefined;
                }
            }

            if (currentBlock.duracion === '2' && field !== 'duracion' && nextBlockIndex < dayBlocks.length) {
                dayBlocks[nextBlockIndex] = { ...dayBlocks[nextBlockIndex], ...currentBlock, duracion: '-1', horaInicio: '' } as HorarioBlock;
            }

            const { docenteId, materiaAsignacionId, horaInicio, duracion } = currentBlock;
            if (!docenteId && !materiaAsignacionId && !horaInicio && !duracion) {
                dayBlocks[bloqueIndex] = undefined;
                if (oldDuration === '2' && nextBlockIndex < dayBlocks.length && dayBlocks[nextBlockIndex]?.duracion === '-1') {
                    dayBlocks[nextBlockIndex] = undefined;
                }
            } else {
                dayBlocks[bloqueIndex] = currentBlock as HorarioBlock;
            }
            
            newWizardData[dia] = dayBlocks;
            return newWizardData;
        });
    };

    const navigateWizard = (direction: 'next' | 'prev') => {
        if (direction === 'next' && !isCurrentBlockValid) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Completa todos los campos o deja el bloque vacío para continuar." });
            return;
        }

        let linearStep = wizardStep.diaIndex * bloques.length + wizardStep.bloqueIndex;
        const totalSteps = diasSemana.length * bloques.length;

        const move = () => {
            if (direction === 'next') linearStep++; else linearStep--;

            if (linearStep >= 0 && linearStep < totalSteps) {
                const diaIndex = Math.floor(linearStep / bloques.length);
                const bloqueIndex = linearStep % bloques.length;
                if (wizardData[diasSemana[diaIndex]]?.[bloqueIndex]?.duracion === '-1') {
                    move(); // Skip continuation blocks
                } else {
                    setWizardStep({ diaIndex, bloqueIndex });
                }
            }
        };
        move();
    };

    const handleSave = () => {
        if (!selectedGroup) return;
        if (!isCurrentBlockValid) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "El último bloque está incompleto." });
            return;
        }
        
        const newHorariosForGroup = diasSemana.map(dia => ({
            id: `${selectedGroup.id}-${dia}`,
            grupoId: selectedGroup.id,
            dia,
            blocks: wizardData[dia] || Array(bloques.length).fill(undefined),
        }));

        setHorarios(prev => [...prev.filter(h => h.grupoId !== selectedGroup.id), ...newHorariosForGroup]);
        toast({ title: "Horario guardado correctamente" });
        setIsDialogOpen(false);
    };

    const { diaIndex, bloqueIndex } = wizardStep;
    const currentDia = diasSemana[diaIndex];
    const currentBlockData = wizardData[currentDia]?.[bloqueIndex];
    const linearStep = diaIndex * bloques.length + bloqueIndex;
    const totalLinearSteps = diasSemana.length * bloques.length;
    const isLastStep = !((diaIndex === diasSemana.length - 1 && bloqueIndex === bloques.length - 1) || wizardData[currentDia]?.[bloqueIndex + 1]?.duracion === '-1' && diaIndex === diasSemana.length - 1 && bloqueIndex === bloques.length - 2);


    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Gestión de Horarios</CardTitle>
                        <CardDescription>Crea y visualiza los horarios semanales por grupo.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openWizard(null)} disabled={grupos.length === 0} className="w-full sm:w-auto"><PlusCircle className="h-4 w-4 mr-2" />Crear Horario</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por carrera..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las carreras</SelectItem>
                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por periodo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los periodos</SelectItem>
                            <Separator />
                            {allCuatrimestres.map(c => <SelectItem key={`cuatri-${c}`} value={`cuatri-${c}`}>Cuatrimestre {c}</SelectItem>)}
                            <Separator />
                            {allSemestres.map(s => <SelectItem key={`sem-${s}`} value={`sem-${s}`}>Semestre {s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {displayedGrupos.map(group => {
                    const groupHorarios = horarios.filter(h => h.grupoId === group.id);
                    if (groupHorarios.length === 0) return null;
                    const carrera = carreras.find(c => c.id === group.carreraId);

                    return (
                        <Card key={group.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Grupo: {group.name}</CardTitle>
                                        <CardDescription>{carrera?.name} - Turno: {group.turno}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openWizard(group)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro de eliminar el horario?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará el horario completo para este grupo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(group.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bloque</TableHead>
                                                {diasSemana.map(dia => <TableHead key={dia} className="text-center">{dia}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bloques.map(bloqueIndex => {
                                                const shouldSkipRow = diasSemana.every(dia => {
                                                    const horarioDia = groupHorarios.find(h => h.dia === dia);
                                                    return bloqueIndex > 0 && horarioDia?.blocks[bloqueIndex - 1]?.duracion === '2';
                                                });
                                                if (shouldSkipRow) return null;

                                                return (
                                                    <TableRow key={bloqueIndex}>
                                                        <TableCell className="font-semibold">Bloque {bloqueIndex + 1}</TableCell>
                                                        {diasSemana.map(dia => {
                                                            const horarioDia = groupHorarios.find(h => h.dia === dia);
                                                            const block = horarioDia?.blocks[bloqueIndex];

                                                            if (bloqueIndex > 0 && horarioDia?.blocks[bloqueIndex - 1]?.duracion === '2') return null;

                                                            return (
                                                                <TableCell key={dia} className="p-1 align-top" rowSpan={block?.duracion === '2' ? 2 : 1}>
                                                                    {block ? (
                                                                        <div className={`text-xs p-2 rounded-md bg-muted border min-w-[180px] max-w-[180px] flex flex-col ${block.duracion === '2' ? 'h-full min-h-[125px] justify-center' : 'min-h-[60px]'}`}>
                                                                            <div className="font-bold text-foreground whitespace-nowrap">{block.horaInicio} - {calculateEndTime(block.horaInicio, parseInt(block.duracion))}</div>
                                                                            <p className="font-semibold truncate" title={getMateriaName(block.materiaAsignacionId)}>{getMateriaName(block.materiaAsignacionId)}</p>
                                                                            <p className="text-muted-foreground truncate" title={getNameById(block.docenteId, docentes)}>{getNameById(block.docenteId, docentes)}</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-muted-foreground text-center p-2 min-h-[60px] flex items-center justify-center">Libre</div>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                    <div className="h-4"></div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    );
                })}
                {displayedGrupos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay horarios que coincidan con los filtros seleccionados.</p>}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{selectedGroup ? `Horario: ${selectedGroup.name}` : 'Crear Horario Semanal'}</DialogTitle>
                    </DialogHeader>
                    {!selectedGroup ? (
                        <div className="pt-4">
                            <Label>Selecciona un grupo para empezar</Label>
                            <Select onValueChange={(groupId) => setSelectedGroup(grupos.find(g => g.id === groupId) || null)}>
                                <SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                           <div className="my-4 space-y-2">
                                <Progress value={((linearStep + 1) / totalLinearSteps) * 100} />
                                <p className="text-center text-sm text-muted-foreground">{`Paso ${linearStep + 1} / ${totalLinearSteps}`}: <strong>{currentDia} - Bloque {bloqueIndex + 1}</strong></p>
                            </div>
                            <ScrollArea className="flex-1 pr-4 -mr-4">
                               <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2"><Label>Materia</Label><Combobox value={currentBlockData?.materiaAsignacionId || ''} onValueChange={(value) => handleBlockDataChange('materiaAsignacionId', value)} options={materiaOptions} placeholder="Selecciona una materia" searchPlaceholder="Buscar materia..." /></div>
                                        <div className="grid gap-2"><Label>Docente</Label><Combobox value={currentBlockData?.docenteId || ''} onValueChange={(value) => handleBlockDataChange('docenteId', value)} options={docenteOptions} placeholder="Selecciona un docente" searchPlaceholder="Buscar docente..." /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2"><Label>Hora Inicio</Label><Input type="time" value={currentBlockData?.horaInicio || ''} onChange={(e) => handleBlockDataChange('horaInicio', e.target.value)} /></div>
                                        <div className="grid gap-2"><Label>Duración</Label><Select value={currentBlockData?.duracion || ''} onValueChange={(value) => handleBlockDataChange('duracion', value)}><SelectTrigger><SelectValue placeholder="Selecciona duración" /></SelectTrigger><SelectContent><SelectItem value="1">1 hora</SelectItem><SelectItem value="2">2 horas</SelectItem></SelectContent></Select></div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="pt-4 border-t mt-auto">
                                <div className='flex justify-between w-full items-center'>
                                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <div className='flex items-center gap-2'>
                                        <Button type="button" variant="outline" onClick={() => navigateWizard('prev')} disabled={linearStep === 0}>Anterior</Button>
                                        {isLastStep ?
                                            <Button type="button" onClick={() => navigateWizard('next')} disabled={!isCurrentBlockValid}>Siguiente</Button>
                                            :
                                            <Button type="button" onClick={handleSave} disabled={!isCurrentBlockValid}>Guardar Horario</Button>
                                        }
                                    </div>
                                </div>
                            </DialogFooter>
                        </div>
                    )}
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
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4">
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
