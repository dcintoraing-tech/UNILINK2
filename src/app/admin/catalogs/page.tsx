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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
interface CatalogItem { id: string; name: string; }
interface Grupo {
    id: string;
    name: string;
    periodoType: 'Cuatrimestre' | 'Semestre';
    periodoNumero: string;
    turno: 'Matutino' | 'Vespertino';
    modalidad: 'Presencial' | 'Sabatina';
}
interface User { id: string; name: string; email: string; role: 'Docente' | 'Admin'; status: 'Activo' | 'Inactivo'; createdAt: string; }
interface AsignacionMateria { id: string; materia: string; carreraId: string; periodoNumero: string; periodoType: 'cuatrimestre' | 'semestre'; }
interface Horario { id: string; grupoId: string; materiaId: string; docenteId: string; dia: string; horaInicio: string; horaFin: string; }


// --- COMPONENTES DE GESTIÓN ---

function CarrerasContent({ carreras, setCarreras }: { carreras: CatalogItem[], setCarreras: (value: CatalogItem[] | ((val: CatalogItem[]) => CatalogItem[])) => void }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<CatalogItem | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        if (!name) return;

        if (currentItem) {
            setCarreras(prev => prev.map(item => item.id === currentItem.id ? { ...item, name } : item));
            toast({ title: "Elemento actualizado" });
        } else {
            setCarreras(prev => [...prev, { id: new Date().toISOString(), name }]);
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
        setCarreras(prev => prev.filter(item => item.id !== itemId));
        toast({ title: "Elemento eliminado" });
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Carreras</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()}> <PlusCircle className="h-4 w-4 mr-2" /> Agregar </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {carreras.map((item) => (
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
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} Carrera</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

function GruposContent({ grupos, setGrupos }: { grupos: Grupo[], setGrupos: (value: Grupo[] | ((val: Grupo[]) => Grupo[])) => void }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Grupo | null>(null);
    const { toast } = useToast();
    const periodos = Array.from({ length: 9 }, (_, i) => (i + 1).toString());

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<Grupo, 'id'>;

        if (!data.name || !data.periodoType || !data.periodoNumero || !data.turno || !data.modalidad) {
            toast({ variant: 'destructive', title: "Error", description: "Todos los campos son obligatorios." });
            return;
        }

        if (currentItem) {
            setGrupos(prev => prev.map(item => item.id === currentItem.id ? { ...item, ...data } : item));
            toast({ title: "Grupo actualizado" });
        } else {
            setGrupos(prev => [...prev, { ...data, id: new Date().toISOString() }]);
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

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Grupos</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()}> <PlusCircle className="h-4 w-4 mr-2" /> Agregar Grupo </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Periodo</TableHead><TableHead>Turno</TableHead><TableHead>Modalidad</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {grupos.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.periodoType} {item.periodoNumero}°</TableCell>
                                <TableCell>{item.turno}</TableCell>
                                <TableCell>{item.modalidad}</TableCell>
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
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} Grupo</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Tipo de Periodo</Label><Select name="periodoType" defaultValue={currentItem?.periodoType} required><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="Cuatrimestre">Cuatrimestre</SelectItem><SelectItem value="Semestre">Semestre</SelectItem></SelectContent></Select></div>
                        <div className="grid gap-2"><Label>Número</Label><Select name="periodoNumero" defaultValue={currentItem?.periodoNumero} required><SelectTrigger><SelectValue placeholder="No." /></SelectTrigger><SelectContent>{periodos.map(p => <SelectItem key={p} value={p}>{p}°</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="grid gap-2"><Label>Turno</Label><Select name="turno" defaultValue={currentItem?.turno} required><SelectTrigger><SelectValue placeholder="Selecciona un turno" /></SelectTrigger><SelectContent><SelectItem value="Matutino">Matutino</SelectItem><SelectItem value="Vespertino">Vespertino</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label>Modalidad</Label><Select name="modalidad" defaultValue={currentItem?.modalidad} required><SelectTrigger><SelectValue placeholder="Selecciona una modalidad" /></SelectTrigger><SelectContent><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Sabatina">Sabatina</SelectItem></SelectContent></Select></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

function MateriasContent({ asignaciones, setAsignaciones, carreras }: { asignaciones: AsignacionMateria[], setAsignaciones: (value: AsignacionMateria[] | ((val: AsignacionMateria[]) => AsignacionMateria[])) => void, carreras: CatalogItem[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const [filterCarrera, setFilterCarrera] = useState<string>('all');
    const [filterPeriodoType, setFilterPeriodoType] = useState<'all' | 'cuatrimestre' | 'semestre'>('all');
    const [filterPeriodoNumero, setFilterPeriodoNumero] = useState<string>('all');
    const [isCommon, setIsCommon] = useState(false);
    const [selectedCareers, setSelectedCareers] = useState<Record<string, boolean>>({});
    
    const getNameById = (id: string, list: CatalogItem[]) => list.find(item => item.id === id)?.name || '—';
    const periodos = useMemo(() => Array.from({ length: 9 }, (_, i) => (i + 1).toString()), []);

    const filteredAsignaciones = useMemo(() => asignaciones.filter(a => 
        (filterCarrera === 'all' || a.carreraId === filterCarrera) &&
        (filterPeriodoType === 'all' || a.periodoType === filterPeriodoType) &&
        (filterPeriodoNumero === 'all' || a.periodoNumero === filterPeriodoNumero)
    ), [asignaciones, filterCarrera, filterPeriodoType, filterPeriodoNumero]);
    
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const materia = formData.get('materia') as string;
        const periodoType = formData.get('periodoType') as 'cuatrimestre' | 'semestre';
        const periodoNumero = formData.get('periodoNumero') as string;

        if (currentItem) {
            const carreraId = formData.get('carreraId') as string;
            if (!materia || !carreraId || !periodoType || !periodoNumero) { toast({ variant: 'destructive', title: "Error", description: "Faltan campos requeridos." }); return; }
            const updatedAsignacion = { materia, carreraId, periodoType, periodoNumero };
            setAsignaciones(prev => prev.map(a => a.id === currentItem.id ? { ...a, ...updatedAsignacion } : a));
            toast({ title: "Asignación actualizada" });
        } else {
            const carrerasAsignar = isCommon ? carreras.map(c => c.id) : Object.entries(selectedCareers).filter(([, checked]) => checked).map(([id]) => id);
            if (!materia || carrerasAsignar.length === 0 || !periodoType || !periodoNumero) { toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." }); return; }
            const newAsignaciones = carrerasAsignar.map(carreraId => ({ id: new Date().toISOString() + Math.random(), materia, carreraId, periodoNumero, periodoType }));
            setAsignaciones(prev => [...prev, ...newAsignaciones]);
            toast({ title: `Asignación(es) creada(s) exitosamente.` });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const openDialog = (item: AsignacionMateria | null) => {
        setCurrentItem(item);
        if (!item) {
            setIsCommon(false);
            setSelectedCareers(carreras.reduce((acc, c) => ({ ...acc, [c.id]: false }), {}));
        }
        setIsDialogOpen(true);
    };

    const handleDelete = (itemId: string) => {
        setAsignaciones(prev => prev.filter(a => a.id !== itemId));
        toast({ title: "Asignación eliminada" });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <CardTitle>Asignación de Materias</CardTitle>
                    <Button size="sm" onClick={() => openDialog(null)} className="w-full md:w-auto"><PlusCircle className="h-4 w-4 mr-2" />Asignar Materia</Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <Select value={filterCarrera} onValueChange={setFilterCarrera}><SelectTrigger><SelectValue placeholder="Filtrar por carrera" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las carreras</SelectItem>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                        <Select value={filterPeriodoType} onValueChange={(v) => { setFilterPeriodoType(v as any); setFilterPeriodoNumero('all'); }}><SelectTrigger><SelectValue placeholder="Filtrar por tipo de periodo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los Periodos</SelectItem><SelectItem value="cuatrimestre">Cuatrimestre</SelectItem><SelectItem value="semestre">Semestre</SelectItem></SelectContent></Select>
                        <Select value={filterPeriodoNumero} onValueChange={setFilterPeriodoNumero}><SelectTrigger><SelectValue placeholder="Filtrar por periodo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{periodos.map(p => <SelectItem key={p} value={p}>{p}°</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Carrera</TableHead><TableHead>Periodo</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader><TableBody>
                        {filteredAsignaciones.length > 0 ? (filteredAsignaciones.map(a => (<TableRow key={a.id}><TableCell className="font-medium">{a.materia}</TableCell><TableCell>{getNameById(a.carreraId, carreras)}</TableCell><TableCell className="capitalize">{a.periodoType} {a.periodoNumero}°</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => openDialog(a)}>Editar</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))) : (<TableRow><TableCell colSpan={4} className="text-center h-24">No hay materias que coincidan con los filtros.</TableCell></TableRow>)}
                    </TableBody></Table></div>
                </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Asignar'} Materia</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="materia">Nombre de la Materia</Label><Input id="materia" name="materia" defaultValue={currentItem?.materia} required /></div>
                    {currentItem ? (<div className="grid gap-2"><Label>Carrera</Label><Select name="carreraId" defaultValue={currentItem?.carreraId} required><SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger><SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>) : (<>
                        <div className="flex items-center space-x-2"><Switch id="isCommon" checked={isCommon} onCheckedChange={checked => { setIsCommon(checked); setSelectedCareers(checked ? carreras.reduce((acc, c) => ({ ...acc, [c.id]: true }), {}) : {}); }} /><Label htmlFor="isCommon">Materia Común (para todas las carreras)</Label></div>
                        <div className="grid gap-2"><Label>Carreras</Label><div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">{carreras.map(c => (<div key={c.id} className="flex items-center space-x-2"><Checkbox id={`carrera-${c.id}`} checked={selectedCareers[c.id] || false} onCheckedChange={checked => !isCommon && setSelectedCareers(p => ({ ...p, [c.id]: !!checked }))} disabled={isCommon} /><Label htmlFor={`carrera-${c.id}`} className="font-normal">{c.name}</Label></div>))}</div></div>
                    </>)}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Tipo de Periodo</Label><Select name="periodoType" defaultValue={currentItem?.periodoType}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="cuatrimestre">Cuatrimestre</SelectItem><SelectItem value="semestre">Semestre</SelectItem></SelectContent></Select></div>
                        <div className="grid gap-2"><Label>Periodo</Label><Select name="periodoNumero" defaultValue={currentItem?.periodoNumero ?? undefined} required><SelectTrigger><SelectValue placeholder="No." /></SelectTrigger><SelectContent>{periodos.map(p => <SelectItem key={p} value={p}>{p}°</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </div>
    );
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes }: { horarios: Horario[], setHorarios: (value: Horario[] | ((val: Horario[]) => Horario[])) => void, grupos: Grupo[], materias: AsignacionMateria[], docentes: User[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Horario | null>(null);

    // State for editing a single entry
    const [editFormData, setEditFormData] = useState<Partial<Horario>>({});

    // State for creating a 4-hour block
    const [createFormState, setCreateFormState] = useState({
        grupoId: '',
        materiaId: '',
        dia: '',
        horaInicio: '07:00'
    });
    const [hourlyTeachers, setHourlyTeachers] = useState<string[]>(['', '', '', '']);
    
    const [availableDays, setAvailableDays] = useState<string[]>([]);
    
    const getNameById = (id: string, list: { id: string, name: string }[] | null) => list?.find(item => item.id === id)?.name || 'N/A';

    // Effect to update available days based on selected group in either form
    useEffect(() => {
        const grupoId = currentItem ? editFormData.grupoId : createFormState.grupoId;
        if (!grupoId) {
            setAvailableDays([]);
            return;
        }
        const selectedGroup = grupos.find(g => g.id === grupoId);
        if (selectedGroup) {
            const days = selectedGroup.modalidad === 'Sabatina' 
                ? ['Sábado'] 
                : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
            setAvailableDays(days);
            
            if (currentItem) { // Edit mode
                if (editFormData.dia && !days.includes(editFormData.dia)) {
                    setEditFormData(prev => ({...prev, dia: undefined}));
                }
            } else { // Create mode
                 if (createFormState.dia && !days.includes(createFormState.dia)) {
                    setCreateFormState(prev => ({...prev, dia: ''}));
                }
            }
        }
    }, [createFormState.grupoId, editFormData.grupoId, currentItem, grupos, createFormState.dia, editFormData.dia]);
    
    const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { grupoId, materiaId, dia, horaInicio } = createFormState;

        if (!grupoId || !materiaId || !dia || !horaInicio || hourlyTeachers.every(t => !t)) {
            toast({ variant: 'destructive', title: "Error", description: "Rellena los campos principales y asigna al menos un docente." });
            return;
        }

        const newHorarios: Horario[] = [];
        const baseDate = new Date();
        const [startH, startM] = horaInicio.split(':').map(Number);
        
        if (isNaN(startH) || isNaN(startM)) {
            toast({ variant: 'destructive', title: "Error de formato", description: "La hora de inicio no es válida." });
            return;
        }

        for (let i = 0; i < 4; i++) {
            const docenteId = hourlyTeachers[i];
            if (docenteId) {
                baseDate.setHours(startH + i, startM, 0, 0);
                const slotHoraInicio = baseDate.toTimeString().substring(0, 5);
                
                baseDate.setHours(startH + i + 1, startM, 0, 0);
                const slotHoraFin = baseDate.toTimeString().substring(0, 5);

                newHorarios.push({
                    id: new Date().toISOString() + Math.random(),
                    grupoId,
                    materiaId,
                    docenteId,
                    dia,
                    horaInicio: slotHoraInicio,
                    horaFin: slotHoraFin
                });
            }
        }
        
        if (newHorarios.length > 0) {
            setHorarios(prev => [...prev, ...newHorarios]);
            toast({ title: "Horario(s) creado(s) exitosamente" });
        }
        
        setIsDialogOpen(false);
    };

    const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
         e.preventDefault();
        const data = editFormData;
        if (!currentItem || !data.grupoId || !data.materiaId || !data.docenteId || !data.dia || !data.horaInicio || !data.horaFin) { 
            toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." }); 
            return; 
        }
        
        setHorarios(prev => prev.map(h => h.id === currentItem.id ? { ...h, ...data } as Horario : h));
        toast({ title: "Horario actualizado" });
        
        setIsDialogOpen(false);
    };

    const openDialog = (item: Horario | null) => { 
        setCurrentItem(item); 
        if (item) { // Editing
            setEditFormData(item);
        } else { // Creating
            setCreateFormState({ grupoId: '', materiaId: '', dia: '', horaInicio: '07:00' });
            setHourlyTeachers(['', '', '', '']);
        }
        setIsDialogOpen(true); 
    };

    const handleDelete = (itemId: string) => { setHorarios(prev => prev.filter(h => h.id !== itemId)); toast({ title: "Horario eliminado" }); };

    const materiaOptions = useMemo(() => {
        const uniqueMaterias = new Map<string, { id: string, name: string }>();
        materias.forEach(m => uniqueMaterias.set(m.materia, { id: m.id, name: m.materia }));
        return Array.from(uniqueMaterias.values());
    }, [materias]);

    const timeSlots = useMemo(() => {
        if (!createFormState.horaInicio || !/^\d{2}:\d{2}$/.test(createFormState.horaInicio)) return ["", "", "", ""];
        
        const slots: string[] = [];
        const baseDate = new Date();
        const [startH, startM] = createFormState.horaInicio.split(':').map(Number);
        
        for (let i = 0; i < 4; i++) {
            baseDate.setHours(startH + i, startM, 0, 0);
            const slotStart = baseDate.toTimeString().substring(0, 5);

            baseDate.setHours(startH + i + 1, startM, 0, 0);
            const slotEnd = baseDate.toTimeString().substring(0, 5);

            slots.push(`${slotStart} - ${slotEnd}`);
        }
        return slots;
    }, [createFormState.horaInicio]);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle>Gestión de Horarios</CardTitle><Button size="sm" onClick={() => openDialog(null)}><PlusCircle className="h-4 w-4 mr-2" />Crear Horario</Button></CardHeader>
            <CardContent>
                <Table><TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Materia</TableHead><TableHead>Docente</TableHead><TableHead>Día</TableHead><TableHead>Horario</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {horarios.map(h => (<TableRow key={h.id}><TableCell>{getNameById(h.grupoId, grupos)}</TableCell><TableCell>{getNameById(h.materiaId, materiaOptions)}</TableCell><TableCell>{getNameById(h.docenteId, docentes)}</TableCell><TableCell>{h.dia}</TableCell><TableCell>{h.horaInicio} - {h.horaFin}</TableCell><TableCell className="text-right">
                            <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => openDialog(h)}>Editar</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(h.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent></DropdownMenu>
                        </TableCell></TableRow>))}
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setCurrentItem(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Crear'} Horario</DialogTitle></DialogHeader>
                    {currentItem ? (
                        // Edit Form for a single entry
                        <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
                            <Select name="grupoId" value={editFormData.grupoId} onValueChange={(v) => setEditFormData(p => ({...p, grupoId: v}))} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                            <Select name="materiaId" value={editFormData.materiaId} onValueChange={(v) => setEditFormData(p => ({...p, materiaId: v}))} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materiaOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                            <Select name="docenteId" value={editFormData.docenteId} onValueChange={(v) => setEditFormData(p => ({...p, docenteId: v}))} required><SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger><SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                            <Select name="dia" value={editFormData.dia} onValueChange={(v) => setEditFormData(p => ({...p, dia: v}))} required disabled={!editFormData.grupoId}><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{availableDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label htmlFor="horaInicio">Hora Inicio</Label><Input id="horaInicio" name="horaInicio" type="time" value={editFormData.horaInicio} onChange={(e) => setEditFormData(p => ({...p, horaInicio: e.target.value}))} required /></div>
                                <div className="grid gap-2"><Label htmlFor="horaFin">Hora Fin</Label><Input id="horaFin" name="horaFin" type="time" value={editFormData.horaFin} onChange={(e) => setEditFormData(p => ({...p, horaFin: e.target.value}))} required /></div>
                            </div>
                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar Cambios</Button></DialogFooter>
                        </form>
                    ) : (
                        // Create Form for a 4-hour block
                        <form onSubmit={handleCreateSubmit} className="grid gap-4 py-4">
                            <Select name="grupoId" value={createFormState.grupoId} onValueChange={(v) => setCreateFormState(p => ({...p, grupoId: v, dia: ''}))} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                            <Select name="materiaId" value={createFormState.materiaId} onValueChange={(v) => setCreateFormState(p => ({...p, materiaId: v}))} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materiaOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                            <Select name="dia" value={createFormState.dia} onValueChange={(v) => setCreateFormState(p => ({...p, dia: v}))} required disabled={!createFormState.grupoId}><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{availableDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                             <div className="grid gap-2"><Label htmlFor="createHoraInicio">Hora Inicio del Bloque</Label><Input id="createHoraInicio" name="horaInicio" type="time" value={createFormState.horaInicio} onChange={(e) => setCreateFormState(p => ({...p, horaInicio: e.target.value}))} required /></div>
                            
                            <Separator className="my-2" />
                            <Label>Asignación de Docentes por Hora</Label>
                            
                            {timeSlots.map((slot, index) => (
                                <div key={index} className="grid grid-cols-[1fr_2fr] items-center gap-4">
                                    <Label htmlFor={`teacher-${index}`} className="text-right">{slot}</Label>
                                    <Select value={hourlyTeachers[index]} onValueChange={(v) => { const newTeachers = [...hourlyTeachers]; newTeachers[index] = v; setHourlyTeachers(newTeachers); }}>
                                        <SelectTrigger id={`teacher-${index}`}><SelectValue placeholder="Selecciona un docente" /></SelectTrigger>
                                        <SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            ))}

                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Crear Horario(s)</Button></DialogFooter>
                        </form>
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
      <div>
        <CardTitle className="mb-4">Catálogos Institucionales</CardTitle>
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras"><CarrerasContent carreras={carreras} setCarreras={setCarreras} /></TabsContent>
            <TabsContent value="grupos"><GruposContent grupos={grupos} setGrupos={setGrupos} /></TabsContent>
            <TabsContent value="materias"><MateriasContent asignaciones={materiaAsignaciones} setAsignaciones={setMateriaAsignaciones} carreras={carreras} /></TabsContent>
            <TabsContent value="horarios"><HorariosContent horarios={horarios} setHorarios={setHorarios} grupos={grupos} materias={materiaAsignaciones} docentes={docentes} /></TabsContent>
        </Tabs>
      </div>
    );
}
