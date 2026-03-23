
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

// --- DATA PERSISTENCE HOOK ---
const useLocalStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                setStoredValue(item ? JSON.parse(item) : initialValue);
            } catch (error) {
                console.log(error);
                setStoredValue(initialValue);
            }
            setIsLoaded(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            } catch (error) {
                console.log(error);
            }
        }
    }, [key, storedValue, isLoaded]);

    return [storedValue, setStoredValue, isLoaded] as const;
};

// --- INTERFACES ---
interface CatalogItem { id: string; name: string; }
interface User { id: string; name: string; email: string; role: 'Docente' | 'Admin'; status: 'Activo' | 'Inactivo'; createdAt: string; }
interface AsignacionMateria { id: string; materia: string; carreraId: string; cuatrimestreId: string | null; semestreId: string | null; }
interface Horario { id: string; grupoId: string; materiaId: string; docenteId: string; dia: string; horaInicio: string; horaFin: string; aula: string; }


// --- COMPONENTES DE GESTIÓN ---

function CatalogTable<T extends CatalogItem>({ title, data, setData }: { title: string, data: T[], setData: React.Dispatch<React.SetStateAction<T[]>> }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<T | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        if (!name) return;

        if (currentItem) {
            setData(prev => prev.map(item => item.id === currentItem.id ? { ...item, name } : item));
            toast({ title: "Elemento actualizado" });
        } else {
            setData(prev => [...prev, { id: new Date().toISOString(), name } as T]);
            toast({ title: "Elemento agregado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const handleOpenDialog = (item: T | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (itemId: string) => {
        setData(prev => prev.filter(item => item.id !== itemId));
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
                        {data.map((item) => (
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
                <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Agregar'} {title.slice(0, -1)}</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={currentItem?.name} required /></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

function MateriasContent({ asignaciones, setAsignaciones, carreras, cuatrimestres, semestres }: { asignaciones: AsignacionMateria[], setAsignaciones: React.Dispatch<React.SetStateAction<AsignacionMateria[]>>, carreras: CatalogItem[], cuatrimestres: CatalogItem[], semestres: CatalogItem[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const [filterCarrera, setFilterCarrera] = useState<string>('all');
    const [filterCuatrimestre, setFilterCuatrimestre] = useState<string>('all');
    const [filterSemestre, setFilterSemestre] = useState<string>('all');
    const [isCommon, setIsCommon] = useState(false);
    const [selectedCareers, setSelectedCareers] = useState<Record<string, boolean>>({});
    const [periodoType, setPeriodoType] = useState<'cuatrimestre' | 'semestre' | 'ambos' | ''>('');
    const getNameById = (id: string, list: CatalogItem[]) => list.find(item => item.id === id)?.name || '—';

    const filteredAsignaciones = useMemo(() => asignaciones.filter(a => (filterCarrera === 'all' || a.carreraId === filterCarrera) && (filterCuatrimestre === 'all' || !a.cuatrimestreId || a.cuatrimestreId === filterCuatrimestre) && (filterSemestre === 'all' || !a.semestreId || a.semestreId === filterSemestre)), [asignaciones, filterCarrera, filterCuatrimestre, filterSemestre]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (currentItem) {
            const data = Object.fromEntries(formData.entries()) as any;
            if (!data.materia || !data.carreraId || (!data.cuatrimestreId && !data.semestreId)) { toast({ variant: 'destructive', title: "Error", description: "Faltan campos requeridos." }); return; }
            const updatedAsignacion = { materia: data.materia, carreraId: data.carreraId, cuatrimestreId: data.cuatrimestreId || null, semestreId: data.semestreId || null };
            setAsignaciones(prev => prev.map(a => a.id === currentItem.id ? { ...a, ...updatedAsignacion } : a));
            toast({ title: "Asignación actualizada" });
        } else {
            const materia = formData.get('materia') as string;
            const cuatrimestreId = formData.get('cuatrimestreId') as string | null;
            const semestreId = formData.get('semestreId') as string | null;
            const carrerasAsignar = isCommon ? carreras.map(c => c.id) : Object.entries(selectedCareers).filter(([, checked]) => checked).map(([id]) => id);
            if (!materia || carrerasAsignar.length === 0 || !periodoType || ((periodoType === 'cuatrimestre' || periodoType === 'ambos') && !cuatrimestreId) || ((periodoType === 'semestre' || periodoType === 'ambos') && !semestreId)) { toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." }); return; }
            const newAsignaciones = carrerasAsignar.map(carreraId => ({ id: new Date().toISOString() + Math.random(), materia, carreraId, cuatrimestreId: (periodoType === 'cuatrimestre' || periodoType === 'ambos') ? cuatrimestreId : null, semestreId: (periodoType === 'semestre' || periodoType === 'ambos') ? semestreId : null }));
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
            setPeriodoType('');
        } else {
            setPeriodoType(item.cuatrimestreId && item.semestreId ? 'ambos' : item.cuatrimestreId ? 'cuatrimestre' : 'semestre');
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <Select value={filterCarrera} onValueChange={setFilterCarrera}><SelectTrigger><SelectValue placeholder="Filtrar por carrera" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las carreras</SelectItem>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                        <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}><SelectTrigger><SelectValue placeholder="Filtrar por cuatrimestre" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cuatrimestres</SelectItem>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                        <Select value={filterSemestre} onValueChange={setFilterSemestre}><SelectTrigger><SelectValue placeholder="Filtrar por semestre" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los semestres</SelectItem>{semestres.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Carrera</TableHead><TableHead>Cuatrimestre</TableHead><TableHead>Semestre</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader><TableBody>
                        {filteredAsignaciones.length > 0 ? (filteredAsignaciones.map(a => (<TableRow key={a.id}><TableCell className="font-medium">{a.materia}</TableCell><TableCell>{getNameById(a.carreraId, carreras)}</TableCell><TableCell>{a.cuatrimestreId ? getNameById(a.cuatrimestreId, cuatrimestres) : '—'}</TableCell><TableCell>{a.semestreId ? getNameById(a.semestreId, semestres) : '—'}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => openDialog(a)}>Editar</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))) : (<TableRow><TableCell colSpan={5} className="text-center h-24">No hay materias que coincidan con los filtros.</TableCell></TableRow>)}
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
                    <div className="grid gap-2"><Label>Tipo de Periodo</Label><Select value={periodoType} onValueChange={(v) => setPeriodoType(v as any)}><SelectTrigger><SelectValue placeholder="Selecciona el tipo de periodo" /></SelectTrigger><SelectContent><SelectItem value="cuatrimestre">Cuatrimestre</SelectItem><SelectItem value="semestre">Semestre</SelectItem><SelectItem value="ambos">Ambos</SelectItem></SelectContent></Select></div>
                    {(periodoType === 'cuatrimestre' || periodoType === 'ambos') && (<div className="grid gap-2"><Label>Cuatrimestre</Label><Select name="cuatrimestreId" defaultValue={currentItem?.cuatrimestreId ?? undefined} required={periodoType === 'cuatrimestre'}><SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger><SelectContent>{cuatrimestres?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>)}
                    {(periodoType === 'semestre' || periodoType === 'ambos') && (<div className="grid gap-2"><Label>Semestre</Label><Select name="semestreId" defaultValue={currentItem?.semestreId ?? undefined} required={periodoType === 'semestre'}><SelectTrigger><SelectValue placeholder="Selecciona un semestre" /></SelectTrigger><SelectContent>{semestres?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>)}
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </div>
    );
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes }: { horarios: Horario[], setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>, grupos: CatalogItem[], materias: AsignacionMateria[], docentes: User[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Horario | null>(null);
    const getNameById = (id: string, list: { id: string, name: string }[] | null) => list?.find(item => item.id === id)?.name || 'N/A';
    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<Horario, 'id'>;
        if (!data.grupoId || !data.materiaId || !data.docenteId || !data.dia || !data.horaInicio || !data.horaFin) { toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." }); return; }
        if (currentItem) {
            setHorarios(prev => prev.map(h => h.id === currentItem.id ? { ...h, ...data } : h));
            toast({ title: "Horario actualizado" });
        } else {
            setHorarios(prev => [...prev, { ...data, id: new Date().toISOString() }]);
            toast({ title: "Horario creado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const openDialog = (item: Horario | null) => { setCurrentItem(item); setIsDialogOpen(true); };
    const handleDelete = (itemId: string) => { setHorarios(prev => prev.filter(h => h.id !== itemId)); toast({ title: "Horario eliminado" }); };

    const materiaOptions = useMemo(() => {
        const uniqueMaterias = new Map<string, { id: string, name: string }>();
        materias.forEach(m => uniqueMaterias.set(m.materia, { id: m.id, name: m.materia }));
        return Array.from(uniqueMaterias.values());
    }, [materias]);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle>Gestión de Horarios</CardTitle><Button size="sm" onClick={() => openDialog(null)}><PlusCircle className="h-4 w-4 mr-2" />Crear Horario</Button></CardHeader>
            <CardContent>
                <Table><TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Materia</TableHead><TableHead>Docente</TableHead><TableHead>Día</TableHead><TableHead>Horario</TableHead><TableHead>Aula</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {horarios.map(h => (<TableRow key={h.id}><TableCell>{getNameById(h.grupoId, grupos)}</TableCell><TableCell>{getNameById(h.materiaId, materiaOptions)}</TableCell><TableCell>{getNameById(h.docenteId, docentes)}</TableCell><TableCell>{h.dia}</TableCell><TableCell>{h.horaInicio} - {h.horaFin}</TableCell><TableCell>{h.aula || 'N/A'}</TableCell><TableCell className="text-right">
                            <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => openDialog(h)}>Editar</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(h.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent></DropdownMenu>
                        </TableCell></TableRow>))}
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Crear'} Horario</DialogTitle></DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <Select name="grupoId" defaultValue={currentItem?.grupoId} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                    <Select name="materiaId" defaultValue={currentItem?.materiaId} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materiaOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                    <Select name="docenteId" defaultValue={currentItem?.docenteId} required><SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger><SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                    <Select name="dia" defaultValue={currentItem?.dia} required><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{diasSemana.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label htmlFor="horaInicio">Hora Inicio</Label><Input id="horaInicio" name="horaInicio" type="time" defaultValue={currentItem?.horaInicio} required /></div>
                        <div className="grid gap-2"><Label htmlFor="horaFin">Hora Fin</Label><Input id="horaFin" name="horaFin" type="time" defaultValue={currentItem?.horaFin} required /></div>
                    </div>
                    <div className="grid gap-2"><Label htmlFor="aula">Aula (Opcional)</Label><Input id="aula" name="aula" defaultValue={currentItem?.aula} /></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Crear'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

export default function CatalogsPage() {
    const [carreras, setCarreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos, setGrupos] = useLocalStorage<CatalogItem[]>('unilink-grupos', []);
    const [cuatrimestres, setCuatrimestres] = useLocalStorage<CatalogItem[]>('unilink-cuatrimestres', []);
    const [semestres, setSemestres] = useLocalStorage<CatalogItem[]>('unilink-semestres', []);
    const [turnos, setTurnos] = useLocalStorage<CatalogItem[]>('unilink-turnos', []);
    const [materiaAsignaciones, setMateriaAsignaciones] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [horarios, setHorarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);

    const docentes = useMemo(() => users.filter(u => u.role === 'Docente'), [users]);

    return (
      <div>
        <CardTitle className="mb-4">Catálogos Institucionales</CardTitle>
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="cuatrimestres">Cuatrimestres</TabsTrigger>
                <TabsTrigger value="semestres">Semestres</TabsTrigger>
                <TabsTrigger value="turnos">Turnos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras"><CatalogTable title="Carreras" data={carreras} setData={setCarreras} /></TabsContent>
            <TabsContent value="grupos"><CatalogTable title="Grupos" data={grupos} setData={setGrupos} /></TabsContent>
            <TabsContent value="cuatrimestres"><CatalogTable title="Cuatrimestres" data={cuatrimestres} setData={setCuatrimestres} /></TabsContent>
            <TabsContent value="semestres"><CatalogTable title="Semestres" data={semestres} setData={setSemestres} /></TabsContent>
            <TabsContent value="turnos"><CatalogTable title="Turnos" data={turnos} setData={setTurnos} /></TabsContent>
            <TabsContent value="materias"><MateriasContent asignaciones={materiaAsignaciones} setAsignaciones={setMateriaAsignaciones} carreras={carreras} cuatrimestres={cuatrimestres} semestres={semestres} /></TabsContent>
            <TabsContent value="horarios"><HorariosContent horarios={horarios} setHorarios={setHorarios} grupos={grupos} materias={materiaAsignaciones} docentes={docentes} /></TabsContent>
        </Tabs>
      </div>
    );
}
