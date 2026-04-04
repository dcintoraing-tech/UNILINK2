
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
    duracion: string; // "1" or "2"
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
    const { toast } = useToast();

    // State for wizard flow
    const [currentStep, setCurrentStep] = useState({ diaIndex: 0, bloqueIndex: 0 });
    const [scheduleData, setScheduleData] = useState<Record<string, (HorarioBlock | undefined)[]>>({});

    // Filters
    const [filterCarrera, setFilterCarrera] = useState('all');
    const [filterPeriodo, setFilterPeriodo] = useState('all');

    const diasSemana = useMemo(() => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], []);
    const bloques = useMemo(() => [0, 1, 2, 3], []);

    const displayedGrupos = useMemo(() => {
        return grupos.filter(g => {
            const carreraMatch = !filterCarrera || filterCarrera === 'all' || g.carreraId === filterCarrera;
            if (!filterPeriodo || filterPeriodo === 'all') return carreraMatch;
            
            const [type, value] = filterPeriodo.split('-');
            if (type === 'cuatri') return carreraMatch && g.cuatrimestre === value;
            if (type === 'sem') return carreraMatch && g.semestre === value;
            return carreraMatch;
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

    const openDialog = (group: Grupo | null) => { 
        if (group) { // Editing existing schedule
            setSelectedGroup(group);
            const groupSchedule = horarios.filter(h => h.grupoId === group.id);
            const scheduleByDay: Record<string, (HorarioBlock | undefined)[]> = {};
            diasSemana.forEach(dia => {
                const diaSchedule = groupSchedule.find(h => h.dia === dia);
                scheduleByDay[dia] = diaSchedule ? diaSchedule.blocks : [undefined, undefined, undefined, undefined];
            });
            setScheduleData(scheduleByDay);
        } else { // Creating new schedule
            setSelectedGroup(null);
            setScheduleData({});
        }
        setCurrentStep({ diaIndex: 0, bloqueIndex: 0 });
        setIsDialogOpen(true); 
    };

    const handleDelete = (grupoId: string) => { 
        setHorarios(prev => prev.filter(h => h.grupoId !== grupoId)); 
        toast({ title: "Horario eliminado" }); 
    };
    
    const getNameById = (id: string, list: { id: string, name: string }[]) => list.find(item => item.id === id)?.name || 'N/A';
    const getMateriaName = (id: string) => materias.find(m => m.id === id)?.materia || 'N/A';
    
    const allSemestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);
    const allCuatrimestres = useMemo(() => Array.from({ length: 9 }, (_, i) => `${i + 1}`), []);

    const docenteOptions = useMemo(() => docentes.map(d => ({ value: d.id, label: d.name })), [docentes]);
    const materiaOptions = useMemo(() => materias.map(m => ({ value: m.id, label: `${m.materia} (${getNameById(m.carreraId, carreras)})` })), [materias, carreras]);

    // --- WIZARD LOGIC ---

    const handleNextStep = () => {
        setCurrentStep(prev => {
            if (prev.bloqueIndex < 3) {
                return { ...prev, bloqueIndex: prev.bloqueIndex + 1 };
            }
            if (prev.diaIndex < diasSemana.length - 1) {
                return { diaIndex: prev.diaIndex + 1, bloqueIndex: 0 };
            }
            return prev;
        });
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => {
            if (prev.bloqueIndex > 0) {
                return { ...prev, bloqueIndex: prev.bloqueIndex - 1 };
            }
            if (prev.diaIndex > 0) {
                return { diaIndex: prev.diaIndex - 1, bloqueIndex: 3 };
            }
            return prev;
        });
    };
    
    const handleBlockDataChange = (field: keyof HorarioBlock, value: string) => {
        const { diaIndex, bloqueIndex } = currentStep;
        const dia = diasSemana[diaIndex];

        setScheduleData(prev => {
            const newData = { ...prev };
            if (!newData[dia]) {
                newData[dia] = [undefined, undefined, undefined, undefined];
            }
            const blocksForDay = [...newData[dia]];
            let block = blocksForDay[bloqueIndex];
            
            if (!block) {
                block = { docenteId: '', materiaAsignacionId: '', horaInicio: '', duracion: '' };
            }

            if (!value) {
                const { [field]: _, ...rest } = block as HorarioBlock;
                blocksForDay[bloqueIndex] = Object.keys(rest).length > 0 ? (rest as HorarioBlock) : undefined;
            } else {
                 (block as any)[field] = value;
                 blocksForDay[bloqueIndex] = block;
            }

            newData[dia] = blocksForDay;
            return newData;
        });
    };

    const handleSave = () => {
        const groupId = selectedGroup?.id;
        if (!groupId) return;

        const newHorariosForGroup = diasSemana.map(dia => {
            const blocks = scheduleData[dia] || [];
            const validBlocks = blocks.map(block => 
                (block && block.docenteId && block.materiaAsignacionId && block.horaInicio && block.duracion) ? block : undefined
            );
            return {
                id: `${groupId}-${dia}`,
                grupoId: groupId,
                dia,
                blocks: validBlocks,
            };
        }).filter(horario => horario.blocks.some(b => b !== undefined));

        setHorarios(prev => {
            const otherHorarios = prev.filter(h => h.grupoId !== groupId);
            return [...otherHorarios, ...newHorariosForGroup];
        });

        toast({ title: "Horario guardado correctamente" });
        setIsDialogOpen(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                    <div>
                        <CardTitle>Gestión de Horarios</CardTitle>
                        <CardDescription>Crea y visualiza los horarios semanales por grupo.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openDialog(null)} disabled={grupos.length === 0} className="w-full sm:w-auto"><PlusCircle className="h-4 w-4 mr-2" />Crear Horario</Button>
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
                                            <DropdownMenuItem onClick={() => openDialog(group)}>Editar</DropdownMenuItem>
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
                                            {bloques.map(bloqueIndex => (
                                                <TableRow key={bloqueIndex}>
                                                    <TableCell className="font-semibold">Bloque {bloqueIndex + 1}</TableCell>
                                                    {diasSemana.map(dia => {
                                                        const horarioDia = groupHorarios.find(h => h.dia === dia);
                                                        const block = horarioDia?.blocks[bloqueIndex];
                                                        return (
                                                            <TableCell key={dia} className="min-w-[200px]">
                                                                {block ? (
                                                                    <div className="text-xs p-2 rounded-md bg-muted border min-h-[60px]">
                                                                        <div className="font-bold text-foreground">{block.horaInicio} - {calculateEndTime(block.horaInicio, parseInt(block.duracion))}</div>
                                                                        <div className="font-semibold truncate">{getMateriaName(block.materiaAsignacionId)}</div>
                                                                        <div className="text-muted-foreground truncate">{getNameById(block.docenteId, docentes)}</div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-muted-foreground text-center p-2 min-h-[60px] flex items-center justify-center">Libre</div>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="h-4"></div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                     )
                })}
                {displayedGrupos.length === 0 && <p className="text-center text-muted-foreground">No hay horarios que coincidan con los filtros seleccionados.</p>}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedGroup ? `Editando Horario: ${selectedGroup.name}` : 'Crear Horario Semanal'}</DialogTitle>
                    </DialogHeader>
                    {!selectedGroup ? (
                        <div className="pt-4">
                            <Label>Grupo</Label>
                            <Select onValueChange={(groupId) => setSelectedGroup(grupos.find(g => g.id === groupId) || null)}>
                                <SelectTrigger><SelectValue placeholder="Selecciona un grupo para empezar" /></SelectTrigger>
                                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <DialogFooter className="pt-8">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        (() => {
                            const { diaIndex, bloqueIndex } = currentStep;
                            const dia = diasSemana[diaIndex];
                            const currentBlockData = scheduleData[dia]?.[bloqueIndex];
                            const isFirstStep = diaIndex === 0 && bloqueIndex === 0;
                            const isLastStep = diaIndex === diasSemana.length - 1 && bloqueIndex === 3;
                            
                            return (
                                <>
                                    <div className="my-4 space-y-2">
                                        <Progress value={((diaIndex * 4 + bloqueIndex + 1) / (diasSemana.length * 4)) * 100} />
                                        <p className="text-center text-sm text-muted-foreground">{`Paso ${diaIndex * 4 + bloqueIndex + 1} / ${diasSemana.length * 4}`}: <strong>{dia} - Bloque {bloqueIndex + 1}</strong></p>
                                    </div>
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
                                    <DialogFooter className="pt-4 border-t">
                                        <div className='flex justify-between w-full items-center'>
                                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                            <div className='flex items-center gap-2'>
                                                <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isFirstStep}>Anterior</Button>
                                                {!isLastStep && <Button type="button" onClick={handleNextStep}>Siguiente</Button>}
                                                {isLastStep && <Button type="button" onClick={handleSave}>Guardar Horario</Button>}
                                            </div>
                                        </div>
                                    </DialogFooter>
                                </>
                            )
                        })()
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

    
