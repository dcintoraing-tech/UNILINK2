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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    users: [],
};


// --- COMPONENTES DE GESTIÓN ---

function CatalogTable({ title, data, setData }: { title: string, data: CatalogItem[], setData: React.Dispatch<React.SetStateAction<CatalogItem[]>> }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!name) return;

        if (editingItem) {
            const updatedItems = data.map(item => item.id === editingItem.id ? { ...item, name } : item);
            setData(updatedItems);
            toast({ title: "Elemento actualizado", description: `El elemento ha sido actualizado.` });
        } else {
            const newItem: CatalogItem = {
                id: Date.now().toString(),
                name,
            };
            setData([...data, newItem]);
            toast({ title: "Elemento agregado", description: `El nuevo elemento ha sido agregado.` });
        }

        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const openEditDialog = (item: CatalogItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (itemId: string) => {
        setDeletingItemId(itemId);
        setIsAlertOpen(true);
    };
    
    const handleDeleteConfirm = () => {
        if (!deletingItemId) return;
        setData(data.filter(item => item.id !== deletingItemId));
        toast({ title: "Elemento eliminado", description: "El elemento ha sido eliminado correctamente." });
        setIsAlertOpen(false);
        setDeletingItemId(null);
    };


    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button size="sm" onClick={openCreateDialog}>
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
                                            <DropdownMenuItem onSelect={() => openEditDialog(item)}>Editar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDeleteClick(item.id)} className="text-red-600 focus:text-red-600">
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
                        <DialogTitle>{editingItem ? 'Editar' : 'Agregar'} {title.slice(0, -1)}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" name="name" defaultValue={editingItem?.name} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingItem ? 'Guardar Cambios' : 'Agregar'}</Button>
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
                        <AlertDialogCancel onClick={() => setDeletingItemId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}


function MateriasContent({ asignaciones, setAsignaciones, carreras, cuatrimestres }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAsignacion, setEditingAsignacion] = useState<AsignacionMateria | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const getNameById = (id, list) => list.find(item => item.id === id)?.name || 'N/A';

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<AsignacionMateria, 'id'>;

        if (!data.materia || !data.carreraId || !data.cuatrimestreId) {
            toast({ variant: 'destructive', title: "Error", description: "Todos los campos son requeridos." });
            return;
        }

        if (editingAsignacion) {
            setAsignaciones(asignaciones.map(a => a.id === editingAsignacion.id ? { ...a, ...data } : a));
            toast({ title: "Asignación actualizada" });
        } else {
            setAsignaciones([...asignaciones, { ...data, id: Date.now().toString() }]);
            toast({ title: "Materia asignada" });
        }
        setIsDialogOpen(false);
        setEditingAsignacion(null);
    };
    
    const openDialog = (asignacion: AsignacionMateria | null) => {
        setEditingAsignacion(asignacion);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!deletingId) return;
        setAsignaciones(asignaciones.filter(a => a.id !== deletingId));
        toast({ title: "Asignación eliminada" });
        setIsAlertOpen(false);
        setDeletingId(null);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Asignación de Materias por Carrera y Cuatrimestre</CardTitle>
                    <Button size="sm" onClick={() => openDialog(null)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Asignar Materia
                    </Button>
                </CardHeader>
                <CardContent>
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
                            {asignaciones.map(asignacion => (
                                <TableRow key={asignacion.id}>
                                    <TableCell>{asignacion.materia}</TableCell>
                                    <TableCell>{getNameById(asignacion.carreraId, carreras)}</TableCell>
                                    <TableCell>{getNameById(asignacion.cuatrimestreId, cuatrimestres)}</TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => openDialog(asignacion)}>Editar</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleDeleteClick(asignacion.id)} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
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
                            <DialogTitle>{editingAsignacion ? 'Editar' : 'Asignar'} Materia</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="materia">Nombre de la Materia</Label>
                                <Input id="materia" name="materia" defaultValue={editingAsignacion?.materia} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Carrera</Label>
                                <Select name="carreraId" defaultValue={editingAsignacion?.carreraId} required><SelectTrigger><SelectValue placeholder="Selecciona una carrera" /></SelectTrigger><SelectContent>{carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                            </div>
                             <div className="grid gap-2">
                                <Label>Cuatrimestre</Label>
                                <Select name="cuatrimestreId" defaultValue={editingAsignacion?.cuatrimestreId} required><SelectTrigger><SelectValue placeholder="Selecciona un cuatrimestre" /></SelectTrigger><SelectContent>{cuatrimestres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">{editingAsignacion ? 'Guardar Cambios' : 'Asignar'}</Button>
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
                            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </div>
    )
}

function HorariosContent({ horarios, setHorarios, grupos, materias, docentes }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHorario, setEditingHorario] = useState<Horario | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const getNameById = (id, list) => list.find(item => item.id === id)?.name || 'N/A';
    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Omit<Horario, 'id'>;

        if (!data.grupoId || !data.materiaId || !data.docenteId || !data.dia || !data.horaInicio || !data.horaFin) {
            toast({ variant: 'destructive', title: "Error", description: "Rellena todos los campos obligatorios." });
            return;
        }

        if (editingHorario) {
            setHorarios(horarios.map(h => h.id === editingHorario.id ? { ...h, ...data } : h));
            toast({ title: "Horario actualizado" });
        } else {
            setHorarios([...horarios, { ...data, id: Date.now().toString() }]);
            toast({ title: "Horario creado" });
        }
        setIsDialogOpen(false);
        setEditingHorario(null);
    };

    const openDialog = (horario: Horario | null) => {
        setEditingHorario(horario);
        setIsDialogOpen(true);
    };
    
    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!deletingId) return;
        setHorarios(horarios.filter(h => h.id !== deletingId));
        toast({ title: "Horario eliminado" });
        setIsAlertOpen(false);
        setDeletingId(null);
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
                                            <DropdownMenuItem onSelect={() => openDialog(horario)}>Editar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDeleteClick(horario.id)} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
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
                        <DialogTitle>{editingHorario ? 'Editar' : 'Crear'} Horario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <Select name="grupoId" defaultValue={editingHorario?.grupoId} required><SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="materiaId" defaultValue={editingHorario?.materiaId} required><SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="docenteId" defaultValue={editingHorario?.docenteId} required><SelectTrigger><SelectValue placeholder="Selecciona un docente" /></SelectTrigger><SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                        <Select name="dia" defaultValue={editingHorario?.dia} required><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger><SelectContent>{diasSemana.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label htmlFor="horaInicio">Hora Inicio</Label><Input id="horaInicio" name="horaInicio" type="time" defaultValue={editingHorario?.horaInicio} required /></div>
                            <div className="grid gap-2"><Label htmlFor="horaFin">Hora Fin</Label><Input id="horaFin" name="horaFin" type="time" defaultValue={editingHorario?.horaFin} required /></div>
                        </div>
                        <div className="grid gap-2"><Label htmlFor="aula">Aula (Opcional)</Label><Input id="aula" name="aula" defaultValue={editingHorario?.aula} /></div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingHorario ? 'Guardar Cambios' : 'Crear'}</Button>
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
                        <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
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

    const docentes = useMemo(() => users.filter(u => u.role === 'Docente'), [users]);

    const materias = useMemo(() => {
        const materiaNames = [...new Set(materiaAsignaciones.map(a => a.materia).filter(Boolean))];
        return materiaNames.map(name => ({ id: name, name: name }));
    }, [materiaAsignaciones]);

    const catalogStates = {
        carreras: { state: carreras, setState: setCarreras, key: STORAGE_KEYS.carreras, initial: initialData.carreras },
        grupos: { state: grupos, setState: setGrupos, key: STORAGE_KEYS.grupos, initial: initialData.grupos },
        cuatrimestres: { state: cuatrimestres, setState: setCuatrimestres, key: STORAGE_KEYS.cuatrimestres, initial: initialData.cuatrimestres },
        turnos: { state: turnos, setState: setTurnos, key: STORAGE_KEYS.turnos, initial: initialData.turnos },
        materiaAsignaciones: { state: materiaAsignaciones, setState: setMateriaAsignaciones, key: STORAGE_KEYS.materiaAsignaciones, initial: initialData.materiaAsignaciones },
        horarios: { state: horarios, setState: setHorarios, key: STORAGE_KEYS.horarios, initial: initialData.horarios },
        users: { state: users, setState: setUsers, key: STORAGE_KEYS.users, initial: initialData.users },
    };

    useEffect(() => {
        Object.values(catalogStates).forEach(({ setState, key, initial }) => {
            try {
                const storedData = localStorage.getItem(key);
                if (storedData) {
                    setState(JSON.parse(storedData));
                } else {
                    localStorage.setItem(key, JSON.stringify(initial));
                    setState(initial);
                }
            } catch (error) {
                console.error("Failed to access localStorage:", error);
                setState(initial);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        Object.entries(catalogStates).forEach(([name, { state, key }]) => {
             try {
                // Do not save initial users data if it's empty
                if (name === 'users' && state.length === 0) return;
                localStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.error(`Failed to save to localStorage (${key}):`, error);
            }
        });
    }, [catalogStates]);


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
