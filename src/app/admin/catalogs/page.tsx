"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';


// --- INTERFACES ---
interface CatalogItem {
    id: string;
    name: string;
}
interface User {
    id: string;
    name: string;
    role: 'Docente' | 'Admin';
}
interface AsignacionMateria {
    id: string;
    materia: string;
    carreraId: string;
    cuatrimestreId: string;
}
interface Horario {
    id: string;
    grupoId: string;
    materiaId: string;
    docenteId: string;
    dia: string;
    horaInicio: string;
    horaFin: string;
    aula: string;
}

// --- STORAGE ---
const STORAGE_KEYS = {
    carreras: 'unilink-carreras',
    grupos: 'unilink-grupos-catalogo',
    cuatrimestres: 'unilink-cuatrimestres',
    turnos: 'unilink-turnos',
    materiaAsignaciones: 'unilink-materia-asignaciones',
    horarios: 'unilink-horarios',
    users: 'unilink-users',
};

const initialData = {
    carreras: [{ id: '1', name: 'Ingeniería de Software' }, { id: '2', name: 'Licenciatura en Diseño Gráfico' }],
    grupos: [{ id: '1', name: 'A-101' }, { id: '2', name: 'B-202' }],
    cuatrimestres: [{ id: '1', name: 'Primer Cuatrimestre' }, { id: '2', name: 'Segundo Cuatrimestre' }],
    turnos: [{ id: '1', name: 'Matutino' }, { id: '2', name: 'Vespertino' }],
    materiaAsignaciones: [],
    horarios: [],
    users: [
        {
            id: '1',
            name: 'Ana Gómez',
            email: 'ana.gomez@example.com',
            password: 'password123',
            role: 'Docente',
            status: 'Activo',
            createdAt: '2023-10-25'
        },
        {
            id: '2',
            name: 'Luis Fernandez',
            email: 'luis.fernandez@example.com',
            password: 'password123',
            role: 'Admin',
            status: 'Inactivo',
            createdAt: '2023-10-24'
        }
    ],
};


// --- COMPONENTES DE GESTIÓN ---

function CatalogTable({ title, data, setData }: { title: string, data: CatalogItem[], setData: React.Dispatch<React.SetStateAction<CatalogItem[]>> }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<CatalogItem | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!name) return;

        if (currentItem && currentItem.id) {
            const updatedItems = data.map(item => item.id === currentItem.id ? { ...item, name } : item);
            setData(updatedItems);
            toast({ title: "Elemento actualizado", description: `El elemento ha sido actualizado.` });
        } else {
            const newItem: CatalogItem = {
                id: Date.now().toString(),
                name,
            };
            setData(prevData => [...prevData, newItem]);
            toast({ title: "Elemento agregado", description: `El nuevo elemento ha sido agregado.` });
        }

        setIsDialogOpen(false);
        setCurrentItem(null);
    };
    
    const handleOpenDialog = (item: CatalogItem | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };
    
    const handleOpenAlert = (item: CatalogItem) => {
        setCurrentItem(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!currentItem) return;
        setData(prevData => prevData.filter(item => item.id !== currentItem.id));
        toast({ title: "Elemento eliminado", description: "El elemento ha sido eliminado correctamente." });
        setIsAlertOpen(false);
        setCurrentItem(null);
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleOpenDialog(item)}>Editar</DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenAlert(item)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                Eliminar
                                            </DropdownMenuItem>
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
                    <DialogHeader>
                        <DialogTitle>{currentItem ? 'Editar' : 'Agregar'} {title.slice(0, -1)}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" name="name" defaultValue={currentItem?.name} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Agregar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCurrentItem(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}


function MateriasContent({ asignaciones, setAsignaciones, carreras, cuatrimestres }: { asignaciones: AsignacionMateria[], setAsignaciones: React.Dispatch<React.SetStateAction<AsignacionMateria[]>>, carreras: CatalogItem[], cuatrimestres: CatalogItem[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);

    const [filterCarrera, setFilterCarrera] = useState<string>('all');
    const [filterCuatrimestre, setFilterCuatrimestre] = useState<string>('all');

    const [isCommon, setIsCommon] = useState(false);
    const [selectedCareers, setSelectedCareers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isCommon) {
            const allSelected = carreras.reduce((acc, carrera) => {
                acc[carrera.id] = true;
                return acc;
            }, {} as Record<string, boolean>);
            setSelectedCareers(allSelected);
        }
    }, [isCommon, carreras]);

    const getNameById = (id: string, list: CatalogItem[]) => list.find(item => item.id === id)?.name || 'N/A';
    
    const filteredAsignaciones = useMemo(() => {
        return asignaciones.filter(asignacion => {
            const carreraMatch = filterCarrera === 'all' || asignacion.carreraId === filterCarrera;
            const cuatrimestreMatch = filterCuatrimestre === 'all' || asignacion.cuatrimestreId === filterCuatrimestre;
            return carreraMatch && cuatrimestreMatch;
        });
    }, [asignaciones, filterCarrera, filterCuatrimestre]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
    
        if (currentItem) { // Lógica de edición (sin cambios)
            const data = Object.fromEntries(formData.entries()) as Omit<AsignacionMateria, 'id'>;
            if (!data.materia || !data.carreraId || !data.cuatrimestreId) {
                toast({ variant: 'destructive', title: "Error", description: "Todos los campos son requeridos." });
                return;
            }
            setAsignaciones(prev => prev.map(a => a.id === currentItem.id ? { ...a, ...data } as AsignacionMateria : a));
            toast({ title: "Asignación actualizada" });
        } else { // Lógica de creación
            const materia = formData.get('materia') as string;
            const cuatrimestreId = formData.get('cuatrimestreId') as string;
            const selectedCarreraIds = Object.entries(selectedCareers).filter(([, checked]) => checked).map(([id]) => id);
    
            if (!materia || !cuatrimestreId || selectedCarreraIds.length === 0) {
                toast({ variant: 'destructive', title: "Error", description: "Debes proporcionar un nombre, un cuatrimestre y al menos una carrera." });
                return;
            }
    
            const newAsignaciones: AsignacionMateria[] = selectedCarreraIds.map(carreraId => ({
                id: `${Date.now()}-${carreraId}`,
                materia,
                carreraId,
                cuatrimestreId
            }));
    
            setAsignaciones(prev => [...prev, ...newAsignaciones]);
            toast({ title: "Asignación(es) creada(s) exitosamente." });
        }
    
        setIsDialogOpen(false);
        setCurrentItem(null);
    };
    
    const openDialog = (item: AsignacionMateria | null) => {
        setCurrentItem(item);
        if (!item) {
            setIsCommon(false);
            setSelectedCareers(carreras.reduce((acc, c) => ({...acc, [c.id]: false}), {}));
        }
        setIsDialogOpen(true);
    };

    const openAlert = (item: AsignacionMateria) => {
        setCurrentItem(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!currentItem) return;
        setAsignaciones(asignaciones.filter(a => a.id !== currentItem.id));
        toast({ title: "Asignación eliminada" });
        setIsAlertOpen(false);
        setCurrentItem(null);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1.5">
                        <CardTitle>Asignación de Materias</CardTitle>
                    </div>
                    <Button size="sm" onClick={() => openDialog(null)} className="w-full md:w-auto">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Asignar Materia
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                        <div className="grid gap-2 w-full"><Label>Filtrar por carrera</Label><Select value={filterCarrera} onValueChange={setFilterCarrera}><SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las carreras</SelectItem>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="grid gap-2 w-full"><Label>Filtrar por cuatrimestre</Label><Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}><SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cuatrimestres</SelectItem>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Materia</TableHead>
                                    <TableHead>Carrera</TableHead>
                                    <TableHead>Cuatrimestre</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAsignaciones.length > 0 ? (
                                    filteredAsignaciones.map(asignacion => (
                                        <TableRow key={asignacion.id}>
                                            <TableCell className="font-medium">{asignacion.materia}</TableCell>
                                            <TableCell>{getNameById(asignacion.carreraId, carreras)}</TableCell>
                                            <TableCell>{getNameById(asignacion.cuatrimestreId, cuatrimestres)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => openDialog(asignacion)}>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openAlert(asignacion)} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No hay materias que coincidan con los filtros.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentItem ? 'Editar' : 'Asignar'} Materia</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        {currentItem ? (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="materia">Nombre de la Materia</Label>
                                    <Input id="materia" name="materia" defaultValue={currentItem?.materia} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Carrera</Label>
                                    <Select name="carreraId" defaultValue={currentItem?.carreraId} required><SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger><SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Cuatrimestre</Label>
                                    <Select name="cuatrimestreId" defaultValue={currentItem?.cuatrimestreId} required><SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger><SelectContent>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="materia">Nombre de la Materia</Label>
                                    <Input id="materia" name="materia" required />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="isCommon" checked={isCommon} onCheckedChange={setIsCommon} />
                                    <Label htmlFor="isCommon">Materia Común (para todas las carreras)</Label>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Carreras</Label>
                                    <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
                                        {carreras.map(carrera => (
                                            <div key={carrera.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`carrera-${carrera.id}`}
                                                    checked={selectedCareers[carrera.id] || false}
                                                    onCheckedChange={(checked) => {
                                                        if (!isCommon) {
                                                            setSelectedCareers(prev => ({ ...prev, [carrera.id]: !!checked }));
                                                        }
                                                    }}
                                                    disabled={isCommon}
                                                />
                                                <Label htmlFor={`carrera-${carrera.id}`} className="font-normal">{carrera.name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Cuatrimestre</Label>
                                    <Select name="cuatrimestreId" required>
                                        <SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger>
                                        <SelectContent>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Asignar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará la asignación permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCurrentItem(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes }: { horarios: Horario[], setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>, grupos: CatalogItem[], materias: CatalogItem[], docentes: User[] }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Horario | null>(null);

    const getNameById = (id: string, list: { id: string, name: string }[]) => list.find(item => item.id === id)?.name || 'N/A';
    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<Horario, 'id'>;

        if (!data.grupoId || !data.materiaId || !data.docenteId || !data.dia || !data.horaInicio || !data.horaFin) {
            toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." });
            return;
        }

        if (currentItem) {
            setHorarios(horarios.map(h => h.id === currentItem.id ? { ...h, ...data } as Horario : h));
            toast({ title: "Horario actualizado" });
        } else {
            setHorarios([...horarios, { ...data, id: Date.now().toString() } as Horario]);
            toast({ title: "Horario creado" });
        }
        setIsDialogOpen(false);
        setCurrentItem(null);
    };

    const openDialog = (item: Horario | null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const openAlert = (item: Horario) => {
        setCurrentItem(item);
        setIsAlertOpen(true);
    };
    
    const handleDeleteConfirm = () => {
        if (!currentItem) return;
        setHorarios(horarios.filter(h => h.id !== currentItem.id));
        toast({ title: "Horario eliminado" });
        setIsAlertOpen(false);
        setCurrentItem(null);
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Gestión de Horarios</CardTitle>
                <Button size="sm" onClick={() => openDialog(null)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear Horario
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Grupo</TableHead>
                            <TableHead>Materia</TableHead>
                            <TableHead>Docente</TableHead>
                            <TableHead>Día</TableHead>
                            <TableHead>Horario</TableHead>
                            <TableHead>Aula</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {horarios.map(horario => (
                            <TableRow key={horario.id}>
                                <TableCell>{getNameById(horario.grupoId, grupos)}</TableCell>
                                <TableCell>{getNameById(horario.materiaId, materias)}</TableCell>
                                <TableCell>{getNameById(horario.docenteId, docentes)}</TableCell>
                                <TableCell>{horario.dia}</TableCell>
                                <TableCell>{horario.horaInicio} - {horario.horaFin}</TableCell>
                                <TableCell>{horario.aula || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openDialog(horario)}>Editar</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openAlert(horario)} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{currentItem ? 'Editar' : 'Crear'} Horario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <Select name="grupoId" defaultValue={currentItem?.grupoId} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="materiaId" defaultValue={currentItem?.materiaId} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="docenteId" defaultValue={currentItem?.docenteId} required><SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger><SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="dia" defaultValue={currentItem?.dia} required><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{diasSemana.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label htmlFor="horaInicio">Hora Inicio</Label><Input id="horaInicio" name="horaInicio" type="time" defaultValue={currentItem?.horaInicio} required /></div>
                            <div className="grid gap-2"><Label htmlFor="horaFin">Hora Fin</Label><Input id="horaFin" name="horaFin" type="time" defaultValue={currentItem?.horaFin} required /></div>
                        </div>
                        <div className="grid gap-2"><Label htmlFor="aula">Aula (Opcional)</Label><Input id="aula" name="aula" defaultValue={currentItem?.aula} /></div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{currentItem ? 'Guardar Cambios' : 'Crear'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCurrentItem(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}


export default function CatalogsPage() {
    const [carreras, setCarreras] = useState<CatalogItem[]>([]);
    const [grupos, setGrupos] = useState<CatalogItem[]>([]);
    const [cuatrimestres, setCuatrimestres] = useState<CatalogItem[]>([]);
    const [turnos, setTurnos] = useState<CatalogItem[]>([]);
    const [materiaAsignaciones, setMateriaAsignaciones] = useState<AsignacionMateria[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const docentes = useMemo(() => users.filter(u => u.role === 'Docente'), [users]);

    const materias = useMemo(() => {
        const materiaNames = [...new Set(materiaAsignaciones.map(a => a.materia).filter(Boolean))];
        return materiaNames.map(name => ({ id: name, name: name }));
    }, [materiaAsignaciones]);

    const managedStates = useMemo(() => ({
        carreras: { state: carreras, setState: setCarreras, key: STORAGE_KEYS.carreras, initial: initialData.carreras },
        grupos: { state: grupos, setState: setGrupos, key: STORAGE_KEYS.grupos, initial: initialData.grupos },
        cuatrimestres: { state: cuatrimestres, setState: setCuatrimestres, key: STORAGE_KEYS.cuatrimestres, initial: initialData.cuatrimestres },
        turnos: { state: turnos, setState: setTurnos, key: STORAGE_KEYS.turnos, initial: initialData.turnos },
        materiaAsignaciones: { state: materiaAsignaciones, setState: setMateriaAsignaciones, key: STORAGE_KEYS.materiaAsignaciones, initial: initialData.materiaAsignaciones },
        horarios: { state: horarios, setState: setHorarios, key: STORAGE_KEYS.horarios, initial: initialData.horarios },
        users: { state: users, setState: setUsers, key: STORAGE_KEYS.users, initial: initialData.users },
    }), [carreras, grupos, cuatrimestres, horarios, materiaAsignaciones, turnos, users]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !isLoaded) {
            try {
                Object.values(managedStates).forEach(({ setState, key, initial }) => {
                    const storedData = localStorage.getItem(key);
                    setState(storedData ? JSON.parse(storedData) : initial);
                });
            } catch (error) {
                console.error("Error al cargar desde localStorage:", error);
                 Object.values(managedStates).forEach(({ setState, initial }) => {
                    setState(initial);
                });
            } finally {
                setIsLoaded(true);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded]);

    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            try {
                Object.values(managedStates).forEach(({ state, key }) => {
                    if (state.length > 0) { // Only save if there's data to avoid overwriting with empty arrays on mount
                        localStorage.setItem(key, JSON.stringify(state));
                    }
                });
            } catch (error) {
                 console.error("Error al guardar en localStorage:", error);
            }
        }
    }, [managedStates, isLoaded]);


    return (
      <div>
        <CardTitle className="mb-4">Catálogos Institucionales</CardTitle>
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="cuatrimestres">Cuatrimestres</TabsTrigger>
                <TabsTrigger value="turnos">Turnos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras">
                <CatalogTable title="Carreras" data={carreras} setData={setCarreras} />
            </TabsContent>
            <TabsContent value="grupos">
                <CatalogTable title="Grupos" data={grupos} setData={setGrupos} />
            </TabsContent>
            <TabsContent value="cuatrimestres">
                <CatalogTable title="Cuatrimestres" data={cuatrimestres} setData={setCuatrimestres} />
            </TabsContent>
            <TabsContent value="turnos">
                <CatalogTable title="Turnos" data={turnos} setData={setTurnos} />
            </TabsContent>
             <TabsContent value="materias">
                <MateriasContent 
                    asignaciones={materiaAsignaciones}
                    setAsignaciones={setMateriaAsignaciones}
                    carreras={carreras}
                    cuatrimestres={cuatrimestres}
                />
            </TabsContent>
            <TabsContent value="horarios">
                <HorariosContent 
                    horarios={horarios} 
                    setHorarios={setHorarios}
                    grupos={grupos}
                    materias={materias}
                    docentes={docentes}
                />
            </TabsContent>
        </Tabs>
      </div>
    );
}
