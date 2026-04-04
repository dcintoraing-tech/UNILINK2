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
}

interface AsignacionMateria {
    id: string;
    materia: string;
    cuatrimestreId?: string;
    semestreId?: string;
    carreraId: string;
}

interface Horario {
    id: string;
    grupoId: string;
    materiaAsignacionId: string;
    docenteId: string;
    dia: string;
    horaInicio: string;
    horaFin: string;
    aula: string;
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

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const carreraId = formData.get('carreraId') as string;
        if (!name || !carreraId) return;

        if (currentItem) {
            setGrupos(prev => prev.map(item => item.id === currentItem.id ? { ...item, name, carreraId } : item));
            toast({ title: "Grupo actualizado" });
        } else {
            setGrupos(prev => [...prev, { id: new Date().toISOString(), name, carreraId }]);
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
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Carrera</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {grupos.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{getCarreraName(item.carreraId)}</TableCell>
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
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}


function MateriasContent({ asignaciones, setAsignaciones, carreras, cuatrimestres, semestres }: { asignaciones: AsignacionMateria[], setAsignaciones: (value: AsignacionMateria[] | ((val: AsignacionMateria[]) => AsignacionMateria[])) => void, carreras: CatalogItem[], cuatrimestres: CatalogItem[], semestres: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const materia = formData.get('materia') as string;
        const carreraId = formData.get('carreraId') as string;
        
        const cuatrimestreIdFromForm = formData.get('cuatrimestreId') as string | undefined;
        const semestreIdFromForm = formData.get('semestreId') as string | undefined;

        const cuatrimestreId = cuatrimestreIdFromForm === 'NONE' ? undefined : cuatrimestreIdFromForm;
        const semestreId = semestreIdFromForm === 'NONE' ? undefined : semestreIdFromForm;

        if (!materia || !carreraId || (!cuatrimestreId && !semestreId)) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Debes completar la materia, la carrera y al menos un periodo.",
            });
            return;
        }

        const newAsignacion = { materia, carreraId, cuatrimestreId: cuatrimestreId || undefined, semestreId: semestreId || undefined };

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
        if (!id) return '';
        return list.find(item => item.id === id)?.name || '';
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
                            <TableHead>Cuatrimestre</TableHead>
                            <TableHead>Semestre</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {asignaciones.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.materia}</TableCell>
                                <TableCell>{getNameById(a.carreraId, carreras)}</TableCell>
                                <TableCell>{getNameById(a.cuatrimestreId, cuatrimestres)}</TableCell>
                                <TableCell>{getNameById(a.semestreId, semestres)}</TableCell>
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
                    <div className="grid gap-2"><Label>Carrera</Label><Select name="carreraId" defaultValue={currentItem?.carreraId} required><SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger><SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label>Cuatrimestre (opcional)</Label><Select name="cuatrimestreId" defaultValue={currentItem?.cuatrimestreId}><SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger><SelectContent><SelectItem value="NONE">Ninguno</SelectItem>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label>Semestre (opcional)</Label><Select name="semestreId" defaultValue={currentItem?.semestreId}><SelectTrigger><SelectValue placeholder="Selecciona un semestre" /></SelectTrigger><SelectContent><SelectItem value="NONE">Ninguno</SelectItem>{semestres.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
        </Card>
    );
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes, turnos }: { horarios: Horario[], setHorarios: (value: Horario[] | ((val: Horario[]) => Horario[])) => void, grupos: Grupo[], materias: AsignacionMateria[], docentes: User[], turnos: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Horario | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<Horario, 'id'>;

        if (!data.grupoId || !data.materiaAsignacionId || !data.docenteId || !data.dia || !data.horaInicio || !data.horaFin || !data.aula) {
            toast({ variant: 'destructive', title: "Error", description: "Todos los campos son obligatorios." });
            return;
        }

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
                    <TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Materia</TableHead><TableHead>Docente</TableHead><TableHead>Día</TableHead><TableHead>Horario</TableHead><TableHead>Aula</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {horarios.map(h => (
                            <TableRow key={h.id}>
                                <TableCell>{getNameById(h.grupoId, grupos)}</TableCell>
                                <TableCell>{getMateriaName(h.materiaAsignacionId)}</TableCell>
                                <TableCell>{getNameById(h.docenteId, docentes)}</TableCell>
                                <TableCell>{h.dia}</TableCell>
                                <TableCell>{h.horaInicio} - {h.horaFin}</TableCell>
                                <TableCell>{h.aula}</TableCell>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{currentItem ? 'Editar' : 'Crear'} Horario</DialogTitle></DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <Select name="grupoId" defaultValue={currentItem?.grupoId} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="materiaAsignacionId" defaultValue={currentItem?.materiaAsignacionId} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.materia} ({getNameById(m.carreraId, carreras)})</SelectItem>)}</SelectContent></Select>
                        <Select name="docenteId" defaultValue={currentItem?.docenteId} required><SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger><SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="dia" defaultValue={currentItem?.dia} required><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{diasSemana.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label htmlFor="horaInicio">Hora Inicio</Label><Input id="horaInicio" name="horaInicio" type="time" defaultValue={currentItem?.horaInicio} required /></div>
                            <div className="grid gap-2"><Label htmlFor="horaFin">Hora Fin</Label><Input id="horaFin" name="horaFin" type="time" defaultValue={currentItem?.horaFin} required /></div>
                        </div>
                        <div className="grid gap-2"><Label htmlFor="aula">Aula</Label><Input id="aula" name="aula" defaultValue={currentItem?.aula} required /></div>
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">{currentItem ? 'Guardar Cambios' : 'Crear'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


export default function CatalogsPage() {
    const [carreras, setCarreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos, setGrupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [cuatrimestres, setCuatrimestres] = useLocalStorage<CatalogItem[]>('unilink-cuatrimestres', []);
    const [semestres, setSemestres] = useLocalStorage<CatalogItem[]>('unilink-semestres', []);
    const [turnos, setTurnos] = useLocalStorage<CatalogItem[]>('unilink-turnos', []);
    const [materiaAsignaciones, setMateriaAsignaciones] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [horarios, setHorarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);

    const docentes = useMemo(() => users.filter(u => u.role === 'Docente'), [users]);

    return (
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="cuatrimestres">Cuatrimestres</TabsTrigger>
                <TabsTrigger value="semestres">Semestres</TabsTrigger>
                <TabsTrigger value="turnos">Turnos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras"><CatalogContent title="Carreras" items={carreras} setItems={setCarreras} /></TabsContent>
            <TabsContent value="grupos"><GruposContent grupos={grupos} setGrupos={setGrupos} carreras={carreras} /></TabsContent>
            <TabsContent value="cuatrimestres"><CatalogContent title="Cuatrimestres" items={cuatrimestres} setItems={setCuatrimestres} /></TabsContent>
            <TabsContent value="semestres"><CatalogContent title="Semestres" items={semestres} setItems={setSemestres} /></TabsContent>
            <TabsContent value="turnos"><CatalogContent title="Turnos" items={turnos} setItems={setTurnos} /></TabsContent>
            <TabsContent value="materias"><MateriasContent asignaciones={materiaAsignaciones} setAsignaciones={setMateriaAsignaciones} carreras={carreras} cuatrimestres={cuatrimestres} semestres={semestres} /></TabsContent>
            <TabsContent value="horarios"><HorariosContent horarios={horarios} setHorarios={setHorarios} grupos={grupos} materias={materiaAsignaciones} docentes={docentes} turnos={turnos} /></TabsContent>
        </Tabs>
    );
}
