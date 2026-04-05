
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
import { MoreHorizontal, PlusCircle, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
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
interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; cuatrimestre: string; semestre: string; turno: string; }
interface AsignacionMateria { id: string; materia: string; carreraId: string; cuatrimestre: string; semestre: string; }
interface User { id: string; name: string; role: string; }

// --- HORARIOS INTERFACES ---
interface HorarioBlock {
    materiaId: string;
    docenteId: string;
    duracion: 1 | 2;
}
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [dayIndex: number]: DaySchedule };
interface Horario {
    id: string; // Same as grupoId
    grupoId: string;
    schedule: ScheduleData;
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

// --- GRUPOS COMPONENT ---
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

// --- MATERIAS COMPONENT ---
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

// --- HORARIOS COMPONENT ---
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const HORAS_BLOQUE = ["7:00 - 8:00", "8:00 - 9:00", "9:00 - 10:00", "10:00 - 11:00"];
const TOTAL_DAYS = 5;
const TOTAL_BLOCKS_PER_DAY = 4;

function ScheduleWizard({
    grupos,
    materias,
    docentes,
    onSave,
    onCancel,
    existingHorario
}: {
    grupos: ComboboxOption[];
    materias: ComboboxOption[];
    docentes: ComboboxOption[];
    onSave: (horario: Horario) => void;
    onCancel: () => void;
    existingHorario: Horario | null;
}) {
    const [wizardStep, setWizardStep] = useState(existingHorario ? 'build_schedule' : 'select_group');
    const [selectedGroupId, setSelectedGroupId] = useState<string>(existingHorario?.grupoId || '');
    const [currentDay, setCurrentDay] = useState(0);
    const [currentBlock, setCurrentBlock] = useState(0);

    const initialSchedule = useMemo(() => {
        if (existingHorario) return existingHorario.schedule;
        const newSchedule: ScheduleData = {};
        for (let i = 0; i < TOTAL_DAYS; i++) {
            newSchedule[i] = {};
            for (let j = 0; j < TOTAL_BLOCKS_PER_DAY; j++) {
                newSchedule[i][j] = null;
            }
        }
        return newSchedule;
    }, [existingHorario]);

    const [workingSchedule, setWorkingSchedule] = useState<ScheduleData>(initialSchedule);

    const { toast } = useToast();

    const handleScheduleChange = (field: 'materiaId' | 'docenteId' | 'duracion', value: string | number | null) => {
        setWorkingSchedule(prev => {
            const newSchedule: ScheduleData = JSON.parse(JSON.stringify(prev)); // Deep copy

            const day = newSchedule[currentDay] = newSchedule[currentDay] || {};
            let block = day[currentBlock];
            const isClearingBlock = field === 'materiaId' && value === null;
    
            if (isClearingBlock) {
                day[currentBlock] = null;
                return newSchedule;
            }
    
            if (value) {
                if (!block) {
                    block = day[currentBlock] = { materiaId: '', docenteId: '', duracion: 1 };
                }
                (block as any)[field] = value;
            } else { // value is empty string (from combobox clear)
                if (block) {
                    delete (block as any)[field];
                    if (!block.materiaId && !block.docenteId) {
                        day[currentBlock] = null;
                    }
                }
            }
            
            return newSchedule;
        });
    };

    const currentBlockData = workingSchedule[currentDay]?.[currentBlock];
    const isPartiallyFilled = currentBlockData && (
        (currentBlockData.materiaId && !currentBlockData.docenteId) ||
        (!currentBlockData.materiaId && currentBlockData.docenteId)
    );

    const handleNext = () => {
        if (isPartiallyFilled) {
            toast({ variant: 'destructive', title: "Campos incompletos", description: "Debes seleccionar materia y docente para el bloque, o dejarlo vacío." });
            return;
        }
        const duracion = currentBlockData?.duracion || 1;
        let nextBlock = currentBlock + duracion;
        let nextDay = currentDay;

        if (nextBlock >= TOTAL_BLOCKS_PER_DAY) {
            nextDay++;
            nextBlock = 0;
        }

        if (nextDay < TOTAL_DAYS) {
            setCurrentDay(nextDay);
            setCurrentBlock(nextBlock);
        } else {
            handleSave();
        }
    };
    
    const handleBack = () => {
        let prevBlock = currentBlock - 1;
        let prevDay = currentDay;
        
        if (prevBlock < 0) {
            prevDay--;
            if (prevDay >= 0) {
              prevBlock = TOTAL_BLOCKS_PER_DAY - 1;
            }
        }

        if (prevDay >= 0) {
             let targetBlock = prevBlock;
             let targetDay = prevDay;
             
             // Look backwards for the previous actual block to edit
             let found = false;
             for (let d = prevDay; d >= 0; d--) {
                 for (let b = (d === prevDay ? prevBlock : TOTAL_BLOCKS_PER_DAY - 1); b >=0; b--) {
                     const blockToCheck = workingSchedule[d]?.[b];
                     if(blockToCheck){
                         const dur = blockToCheck.duracion || 1;
                         // Check if this is where the previous step was
                         if(b + dur > prevBlock || d < prevDay){
                            targetDay = d;
                            targetBlock = b;
                            found = true;
                            break;
                         }
                     } else {
                        // Empty block, this must be the step
                        targetDay = d;
                        targetBlock = b;
                        found = true;
                        break;
                     }
                 }
                 if(found) break;
             }
             setCurrentDay(targetDay);
             setCurrentBlock(targetBlock);
        }
    };

    const handleSave = () => {
        if (isPartiallyFilled) {
            toast({ variant: 'destructive', title: "Campos incompletos", description: "El último bloque está incompleto." });
            return;
        }
        const newHorario: Horario = {
            id: selectedGroupId,
            grupoId: selectedGroupId,
            schedule: workingSchedule,
        };
        onSave(newHorario);
    };

    const selectedGroupName = useMemo(() => grupos.find(g => g.value === selectedGroupId)?.label, [selectedGroupId, grupos]);
    const progress = useMemo(() => {
        const totalSteps = TOTAL_DAYS * TOTAL_BLOCKS_PER_DAY;
        const currentStep = currentDay * TOTAL_BLOCKS_PER_DAY + currentBlock;
        return (currentStep / totalSteps) * 100;
    }, [currentDay, currentBlock]);

    const isLastStep = currentDay === TOTAL_DAYS - 1 && currentBlock >= TOTAL_BLOCKS_PER_DAY - (workingSchedule[TOTAL_DAYS - 1]?.[TOTAL_BLOCKS_PER_DAY-1]?.duracion || 1)

    if (wizardStep === 'select_group') {
        return (
            <>
                <DialogDescription>Selecciona el grupo para el cual deseas crear o editar un horario.</DialogDescription>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="grupo">Grupo</Label>
                        <Select onValueChange={setSelectedGroupId} value={selectedGroupId}>
                            <SelectTrigger id="grupo"><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                            <SelectContent>{grupos.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={() => {
                        if (selectedGroupId) setWizardStep('build_schedule')
                        else toast({ variant: 'destructive', title: 'Selecciona un grupo' })
                    }}>Comenzar</Button>
                </DialogFooter>
            </>
        );
    }
    
    const isBlockOccupied = useMemo(() => {
       for(let i = 1; i < TOTAL_BLOCKS_PER_DAY; i++){
           const prevBlockToCheck = workingSchedule[currentDay]?.[currentBlock - i];
           if(prevBlockToCheck && (prevBlockToCheck.duracion || 1) > i){
               return true;
           }
       }
       return false;

    }, [currentDay, currentBlock, workingSchedule]);
    
    return (
        <>
            <DialogHeader>
                <DialogTitle>{existingHorario ? 'Editar' : 'Crear'} Horario: {selectedGroupName}</DialogTitle>
                <DialogDescription>
                    Estás en: <strong>{DIAS_SEMANA[currentDay]}</strong>, bloque de <strong>{HORAS_BLOQUE[currentBlock]}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <Progress value={progress} />
                {isBlockOccupied ? (
                    <div className="text-center text-muted-foreground py-10">
                        Este bloque está ocupado por la clase anterior.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Materia</Label>
                            <Combobox 
                                options={materias} 
                                value={currentBlockData?.materiaId || ''}
                                onValueChange={(val) => handleScheduleChange('materiaId', val)}
                                placeholder="Seleccionar materia..."
                                searchPlaceholder="Buscar materia..."
                                emptyMessage="No se encontró la materia."
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Docente</Label>
                             <Combobox 
                                options={docentes} 
                                value={currentBlockData?.docenteId || ''}
                                onValueChange={(val) => handleScheduleChange('docenteId', val)}
                                placeholder="Seleccionar docente..."
                                searchPlaceholder="Buscar docente..."
                                emptyMessage="No se encontró el docente."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Duración (horas)</Label>
                            <Select 
                                value={String(currentBlockData?.duracion || 1)}
                                onValueChange={(val) => handleScheduleChange('duracion', parseInt(val))}
                                disabled={!currentBlockData || currentBlock === TOTAL_BLOCKS_PER_DAY - 1}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 hora</SelectItem>
                                    <SelectItem value="2">2 horas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-end">
                            <Button variant="outline" size="sm" onClick={() => handleScheduleChange('materiaId', null)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Limpiar bloque
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter className="flex justify-between w-full">
                <Button variant="outline" onClick={handleBack} disabled={currentDay === 0 && currentBlock === 0}>
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Anterior
                </Button>
                <Button onClick={handleNext} disabled={isPartiallyFilled}>
                    {isLastStep ? 'Guardar Horario' : 'Siguiente'}
                    {!isLastStep && <ArrowRight className="h-4 w-4 ml-2"/>}
                </Button>
            </DialogFooter>
        </>
    )
}

function HorariosContent({
    horarios, setHorarios, grupos, materias, users
}: {
    horarios: Horario[],
    setHorarios: (value: Horario[] | ((val: Horario[]) => Horario[])) => void,
    grupos: Grupo[],
    materias: AsignacionMateria[],
    users: User[],
}) {
    const { toast } = useToast();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingHorario, setEditingHorario] = useState<Horario | null>(null);

    const docenteOptions = useMemo(() => users.filter(u => u.role === 'Docente').map(u => ({ value: u.id, label: u.name })), [users]);
    const materiaOptions = useMemo(() => materias.map(m => ({ value: m.id, label: m.materia })), [materias]);
    const grupoOptions = useMemo(() => grupos.map(g => ({ value: g.id, label: g.name })), [grupos]);

    const handleSaveHorario = (horario: Horario) => {
        setHorarios(prev => {
            const existingIndex = prev.findIndex(h => h.id === horario.id);
            if (existingIndex > -1) {
                const newHorarios = [...prev];
                newHorarios[existingIndex] = horario;
                return newHorarios;
            }
            return [...prev, horario];
        });
        toast({ title: "Horario guardado", description: "El horario se ha guardado correctamente." });
        setIsWizardOpen(false);
        setEditingHorario(null);
    };

    const handleDeleteHorario = (grupoId: string) => {
        setHorarios(prev => prev.filter(h => h.id !== grupoId));
        toast({ title: "Horario eliminado" });
    }

    const openWizard = (horario: Horario | null = null) => {
        setEditingHorario(horario);
        setIsWizardOpen(true);
    };

    const renderCell = (horario: Horario, dayIndex: number, blockIndex: number) => {
        const block = horario.schedule[dayIndex]?.[blockIndex];

        // Check if a previous block spans over this one
        for (let i = 1; i < TOTAL_BLOCKS_PER_DAY; i++) {
            const prevBlock = horario.schedule[dayIndex]?.[blockIndex - i];
            if (prevBlock && (prevBlock.duracion || 1) > i) {
                return null; // This cell is spanned by a previous one, so don't render it.
            }
        }
        
        if (!block) {
            return <TableCell key={`${dayIndex}-${blockIndex}`}></TableCell>;
        }

        const materia = materias.find(m => m.id === block.materiaId);
        const docente = users.find(u => u.id === block.docenteId);

        return (
            <TableCell key={`${dayIndex}-${blockIndex}`} rowSpan={block.duracion} className="align-top bg-muted/50 p-2 max-w-32">
                <div className="font-bold truncate" title={materia?.materia}>{materia?.materia || 'Materia no encontrada'}</div>
                <div className="text-xs text-muted-foreground truncate" title={docente?.name}>{docente?.name || 'Docente no encontrado'}</div>
            </TableCell>
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Horarios</CardTitle>
                    <CardDescription>Gestiona los horarios de los grupos.</CardDescription>
                </div>
                <Button size="sm" onClick={() => openWizard(null)} disabled={grupos.length === 0} className="w-full sm:w-auto">
                     <PlusCircle className="h-4 w-4 mr-2" /> Crear Horario
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {horarios.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay horarios creados. ¡Crea el primero!</p>}
                {horarios.map(horario => {
                    const grupo = grupos.find(g => g.id === horario.grupoId);
                    return (
                        <Card key={horario.id}>
                            <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{grupo?.name || 'Grupo no encontrado'}</CardTitle>
                                    <CardDescription>Turno {grupo?.turno}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => openWizard(horario)}>Editar</DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente el horario de este grupo.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteHorario(horario.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <Table className="border table-fixed w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[12%]">Hora</TableHead>
                                            {DIAS_SEMANA.map(dia => <TableHead key={dia} className="w-[17.6%]">{dia}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {HORAS_BLOQUE.map((hora, blockIndex) => (
                                            <TableRow key={hora}>
                                                <TableCell className="font-medium">{hora}</TableCell>
                                                {DIAS_SEMANA.map((_, dayIndex) => renderCell(horario, dayIndex, blockIndex))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })}
            </CardContent>
             <Dialog open={isWizardOpen} onOpenChange={(open) => { if (!open) { setIsWizardOpen(false); setEditingHorario(null); } }}>
                <DialogContent className="sm:max-w-2xl flex flex-col">
                     <ScheduleWizard
                        grupos={grupoOptions}
                        materias={materiaOptions}
                        docentes={docenteOptions}
                        onSave={handleSaveHorario}
                        onCancel={() => { setIsWizardOpen(false); setEditingHorario(null); }}
                        existingHorario={editingHorario}
                    />
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
    const [users] = useLocalStorage<User[]>('unilink-users', []);

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
            <TabsContent value="horarios"><HorariosContent horarios={horarios} setHorarios={setHorarios} grupos={grupos} materias={materiaAsignaciones} users={users} /></TabsContent>
        </Tabs>
    );
}
