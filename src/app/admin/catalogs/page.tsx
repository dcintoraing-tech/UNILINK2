

"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, ArrowLeft, ArrowRight, Trash2, Upload, Download } from 'lucide-react';
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc, Firestore, writeBatch, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';


// --- INTERFACES ---
interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; cuatrimestre: string; semestre: string; turno: string; modalidadId?: string; sedeId?: string; }
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


// --- GENERIC  COMPONENT ---
function CatalogContent({ title, items, onAdd, onEdit, onDelete }: { title: string, items: CatalogItem[], onAdd: (name: string) => Promise<void>, onEdit: (id: string, name: string) => Promise<void>, onDelete: (id: string) => Promise<void> }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<CatalogItem | null>(null);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        if (!name) return;

        if (currentItem) {
            await onEdit(currentItem.id, name);
        } else {
            await onAdd(name);
        }
        window.location.reload();
    };

    const handleOpenDialog = (item: CatalogItem | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = async (itemId: string) => {
        await onDelete(itemId);
        window.location.reload();
    };

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{title}</CardTitle>
                <Button className="w-full sm:w-auto" size="sm" onClick={() => handleOpenDialog()}> <PlusCircle className="h-4 w-4 mr-2" /> Agregar </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
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
function GruposContent({ firestore, grupos, carreras, modalidades, sedes }: { firestore: Firestore, grupos: Grupo[], setGrupos?: any, carreras: CatalogItem[], modalidades: CatalogItem[], sedes: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Grupo | null>(null);
    const { toast } = useToast();

    const cuatrimestres = Array.from({ length: 9 }, (_, i) => `${i + 1}`);
    const semestres = Array.from({ length: 9 }, (_, i) => `${i + 1}`);
    const turnos = ["Matutino", "Vespertino", "Nocturno"];

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const carreraId = formData.get('carreraId') as string;
        const cuatrimestre = formData.get('cuatrimestre') as string;
        const semestre = formData.get('semestre') as string;
        const turno = formData.get('turno') as string;
        const modalidadId = formData.get('modalidadId') as string;
        const sedeId = formData.get('sedeId') as string;

        if (!name || !carreraId || !turno) return;
        
        if (cuatrimestre === "NONE" && semestre === "NONE") {
             toast({ variant: "destructive", title: "Error", description: "Debe seleccionar un cuatrimestre o un semestre." });
             return;
        }

        const groupData = { name, carreraId, cuatrimestre, semestre, turno, modalidadId, sedeId };
        
        try {
            if (currentItem) {
                await updateDoc(doc(firestore, 'grupos', currentItem.id), groupData);
                toast({ title: "Grupo actualizado" });
            } else {
                await addDoc(collection(firestore, 'grupos'), groupData);
                toast({ title: "Grupo agregado" });
            }
            window.location.reload();
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el grupo." });
        }
    };

    const handleOpenDialog = (item: Grupo | null = null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = async (itemId: string) => {
        try {
            await deleteDoc(doc(firestore, 'grupos', itemId));
            toast({ title: "Grupo eliminado" });
            window.location.reload();
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo." });
        }
    };
    
    const getRelationName = (id: string | undefined, items: CatalogItem[]) => {
        if (!id) return 'N/A';
        return items.find(c => c.id === id)?.name || 'N/A';
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
                {/* Mobile View */}
                <div className="grid gap-4 md:hidden">
                    {grupos.map((item) => (
                        <Card key={item.id}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div>
                                    <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
                                    <CardDescription>{getRelationName(item.carreraId, carreras)}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
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
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <dt className="text-muted-foreground">Cuatrimestre</dt>
                                    <dd>{item.cuatrimestre === "NONE" ? "N/A" : item.cuatrimestre}</dd>
                                    <dt className="text-muted-foreground">Turno</dt>
                                    <dd>{item.turno}</dd>
                                    <dt className="text-muted-foreground">Modalidad</dt>
                                    <dd>{getRelationName(item.modalidadId, modalidades)}</dd>
                                    <dt className="text-muted-foreground">Sede</dt>
                                    <dd>{getRelationName(item.sedeId, sedes)}</dd>
                                </dl>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View */}
                <Table className="hidden md:table">
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Carrera</TableHead><TableHead>Periodo</TableHead><TableHead>Turno</TableHead><TableHead>Modalidad</TableHead><TableHead>Sede</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {grupos.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{getRelationName(item.carreraId, carreras)}</TableCell>
                                <TableCell>{item.cuatrimestre !== "NONE" ? `${item.cuatrimestre}º Cuatri.` : `${item.semestre}º Sem.`}</TableCell>
                                <TableCell>{item.turno}</TableCell>
                                <TableCell>{getRelationName(item.modalidadId, modalidades)}</TableCell>
                                <TableCell>{getRelationName(item.sedeId, sedes)}</TableCell>
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
                        <ScrollArea className="max-h-[70vh] pr-4">
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
                                <div className="grid gap-2">
                                    <Label htmlFor="modalidadId">Modalidad</Label>
                                    <Select name="modalidadId" defaultValue={currentItem?.modalidadId}>
                                        <SelectTrigger id="modalidadId"><SelectValue placeholder="Selecciona una modalidad" /></SelectTrigger>
                                        <SelectContent>{modalidades.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sedeId">Sede</Label>
                                    <Select name="sedeId" defaultValue={currentItem?.sedeId}>
                                        <SelectTrigger id="sedeId"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
                                        <SelectContent>{sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
function MateriasContent({ firestore, asignaciones, carreras }: { firestore: Firestore, asignaciones: AsignacionMateria[], carreras: CatalogItem[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AsignacionMateria | null>(null);
    const { toast } = useToast();
    const [filterCarrera, setFilterCarrera] = useState('all');
    const [filterPeriodo, setFilterPeriodo] = useState('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

        try {
            if (currentItem) {
                await updateDoc(doc(firestore, 'materiaAsignaciones', currentItem.id), newAsignacion);
                toast({ title: "Asignación actualizada" });
            } else {
                await addDoc(collection(firestore, 'materiaAsignaciones'), newAsignacion);
                toast({ title: "Materia asignada" });
            }
            window.location.reload();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la asignación.' });
        }
    };

    const openDialog = (item: AsignacionMateria | null) => {
        setCurrentItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = async (itemId: string) => {
        try {
            await deleteDoc(doc(firestore, 'materiaAsignaciones', itemId));
            toast({ title: "Asignación eliminada" });
            window.location.reload();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la asignación.' });
        }
    };

    const getCarreraName = (id: string | undefined) => {
        if (!id) return 'N/A';
        return carreras.find(item => item.id === id)?.name || 'Carrera Desconocida';
    };

    const handleDownloadTemplate = () => {
        const headers = [['materia', 'cuatrimestre', 'semestre', 'carreraId', 'carreraName']];
        const ws = XLSX.utils.aoa_to_sheet(headers);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Materias");
        
        if (carreras.length > 0) {
            const carrerasSheetData = carreras.map(c => ({ 'ID de Carrera': c.id, 'Nombre de Carrera': c.name }));
            const carrerasSheet = XLSX.utils.json_to_sheet(carrerasSheetData);
            XLSX.utils.book_append_sheet(wb, carrerasSheet, "IDs y Nombres de Carreras");
        }
        
        XLSX.writeFile(wb, "plantilla_materias.xlsx");
        toast({ title: "Plantilla descargada", description: "El archivo de plantilla de Excel está listo para usarse." });
    };

    const handleExport = () => {
        if (filteredAsignaciones.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay materias para exportar.' });
            return;
        }
        const dataToExport = filteredAsignaciones.map(a => ({
            'Materia': a.materia,
            'Carrera': getCarreraName(a.carreraId),
            'ID de Carrera': a.carreraId,
            'Cuatrimestre': a.cuatrimestre === 'NONE' ? '' : a.cuatrimestre,
            'Semestre': a.semestre === 'NONE' ? '' : a.semestre,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Materias");
        XLSX.writeFile(wb, "materias.xlsx");
        toast({ title: "Exportación exitosa", description: "La lista de materias ha sido descargada." });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                if (carreras.length === 0) {
                     toast({ variant: "destructive", title: "Error de importación", description: "No hay carreras cargadas en el sistema. Agrega carreras antes de importar materias." });
                     return;
                }

                // Fetch all existing assignments to check for duplicates in memory
                const existingAssignmentsSnapshot = await getDocs(collection(firestore, 'materiaAsignaciones'));
                const existingAssignments = existingAssignmentsSnapshot.docs.map(doc => doc.data() as Omit<AsignacionMateria, 'id'>);

                const batch = writeBatch(firestore);
                let createdCount = 0;
                let skippedCount = 0;
                const validationErrors: string[] = [];

                for (const [index, item] of json.entries()) {
                    const rowNum = index + 2; // Excel rows are 1-based, and we have a header
                    const materia = item.materia ? String(item.materia).trim() : '';

                    let resolvedCarreraId = item.carreraId ? String(item.carreraId).trim() : '';
                    const carreraName = item.carreraName ? String(item.carreraName).trim() : '';
                    
                    if (!resolvedCarreraId && carreraName) {
                        const foundCarrera = carreras.find(c => c.name.toLowerCase() === carreraName.toLowerCase());
                        if (foundCarrera) {
                            resolvedCarreraId = foundCarrera.id;
                        } else {
                            validationErrors.push(`Fila ${rowNum}: No se encontró la carrera "${carreraName}".`);
                            skippedCount++;
                            continue;
                        }
                    } else if (!resolvedCarreraId) {
                         validationErrors.push(`Fila ${rowNum}: Se debe proporcionar 'carreraId' o 'carreraName'.`);
                         skippedCount++;
                         continue;
                    }
                    
                    const normalizePeriod = (period: any) => {
                        const periodStr = period ? String(period).trim().toLowerCase() : '';
                        if (!periodStr || ['ninguno', 'none', 'n/a'].includes(periodStr)) {
                            return 'NONE';
                        }
                        return String(period);
                    }

                    const cuatrimestre = normalizePeriod(item.cuatrimestre);
                    const semestre = normalizePeriod(item.semestre);

                    if (!materia) {
                        validationErrors.push(`Fila ${rowNum}: El campo 'materia' no puede estar vacío.`);
                        skippedCount++;
                        continue;
                    }

                    if (cuatrimestre === 'NONE' && semestre === 'NONE') {
                        validationErrors.push(`Fila ${rowNum}: Se debe especificar un 'cuatrimestre' o 'semestre'.`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Check for duplicates
                    const isDuplicate = existingAssignments.some(existing => 
                        existing.materia.toLowerCase() === materia.toLowerCase() &&
                        existing.carreraId === resolvedCarreraId &&
                        existing.cuatrimestre === cuatrimestre &&
                        existing.semestre === semestre
                    );
                    
                    if (isDuplicate) {
                        skippedCount++;
                        continue; // Silently skip duplicates, or add to a specific message
                    }

                    const newAsignacion = {
                        materia,
                        carreraId: resolvedCarreraId,
                        cuatrimestre,
                        semestre,
                    };
                    const newDocRef = doc(collection(firestore, 'materiaAsignaciones'));
                    batch.set(newDocRef, newAsignacion);
                    createdCount++;
                }

                if (createdCount > 0) {
                    await batch.commit();
                }
                
                let toastDescription = `${createdCount} materia(s) creada(s).`;
                if (skippedCount > 0) toastDescription += ` ${skippedCount} fila(s) omitida(s) por ser duplicados o tener errores.`;
                
                if (validationErrors.length > 0) {
                    toast({
                        variant: "destructive",
                        title: "Importación con Errores",
                        description: `${toastDescription} ${validationErrors.join(" ")}`,
                        duration: 10000,
                    });
                } else {
                    toast({
                        title: "Importación Finalizada",
                        description: toastDescription,
                    });
                }
                
                if (createdCount > 0) {
                    window.location.reload();
                }

            } catch (error: any) {
                console.error("Error al importar el archivo:", error);
                toast({
                    variant: "destructive",
                    title: "Error de importación",
                    description: "No se pudo procesar el archivo. Revisa que el formato y los datos sean correctos.",
                });
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <Card>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".xlsx, .xls"
                className="hidden"
            />
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Asignación de Materias</CardTitle>
                  <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                      <Button size="sm" onClick={() => openDialog(null)} disabled={carreras.length === 0}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Asignar Materia
                      </Button>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                  <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={handleImportClick}>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Importar desde archivo
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={handleExport} disabled={filteredAsignaciones.length === 0}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Exportar a Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={handleDownloadTemplate}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Descargar plantilla
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
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
                {/* Mobile View */}
                <div className="grid gap-4 md:hidden">
                    {filteredAsignaciones.map((a) => (
                        <Card key={a.id}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div>
                                    <CardTitle className="text-base font-semibold">{a.materia}</CardTitle>
                                    <CardDescription>{getCarreraName(a.carreraId)}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
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
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <dt className="text-muted-foreground">Cuatrimestre</dt>
                                    <dd>{a.cuatrimestre === 'NONE' ? 'N/A' : a.cuatrimestre}</dd>
                                    <dt className="text-muted-foreground">Semestre</dt>
                                    <dd>{a.semestre === 'NONE' ? 'N/A' : a.semestre}</dd>
                                </dl>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View */}
                <Table className="hidden md:table">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead>Carrera</TableHead>
                            <TableHead>Cuatrimestre</TableHead>
                            <TableHead>Semestre</TableHead>
                            <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
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
    onSave: (horario: Horario) => Promise<void>;
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
    
    const selectedGroupName = useMemo(() => grupos.find(g => g.value === selectedGroupId)?.label, [selectedGroupId, grupos]);
    const progress = useMemo(() => {
        const totalSteps = TOTAL_DAYS * TOTAL_BLOCKS_PER_DAY;
        const currentStep = currentDay * TOTAL_BLOCKS_PER_DAY + currentBlock;
        return (currentStep / totalSteps) * 100;
    }, [currentDay, currentBlock]);

    const isBlockOccupied = (() => {
        for (let i = 1; i <= currentBlock; i++) {
          const prevIndex = currentBlock - i;
          if (prevIndex < 0) continue;
      
          const prevBlock = workingSchedule[currentDay]?.[prevIndex];
          if (prevBlock && (prevBlock.duracion || 1) > i) {
            return true;
          }
        }
        return false;
    })();

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

    const handleSave = async () => {
        if (isPartiallyFilled) {
            toast({ variant: 'destructive', title: "Campos incompletos", description: "El último bloque está incompleto." });
            return;
        }
        const newHorario: Horario = {
            id: selectedGroupId,
            grupoId: selectedGroupId,
            schedule: workingSchedule,
        };
        await onSave(newHorario);
    };

    const isLastStep = currentDay === TOTAL_DAYS - 1 && currentBlock >= TOTAL_BLOCKS_PER_DAY - (workingSchedule[TOTAL_DAYS - 1]?.[TOTAL_BLOCKS_PER_DAY-1]?.duracion || 1)

    if (wizardStep === 'select_group') {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>Crear o Editar Horario</DialogTitle>
                    <DialogDescription>Selecciona el grupo para el cual deseas crear o editar un horario.</DialogDescription>
                </DialogHeader>
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
    firestore, horarios, grupos, materias, users
}: {
    firestore: Firestore,
    horarios: Horario[],
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

    const handleSaveHorario = async (horario: Horario) => {
        try {
            await setDoc(doc(firestore, "horarios", horario.id), horario, { merge: true });
            toast({ title: "Horario guardado", description: "El horario se ha guardado correctamente." });
            window.location.reload();
        } catch (error) {
            console.error("Error saving horario:", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el horario." });
        }
    };

    const handleDeleteHorario = async (grupoId: string) => {
        try {
            await deleteDoc(doc(firestore, "horarios", grupoId));
            toast({ title: "Horario eliminado" });
            window.location.reload();
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el horario." });
        }
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
                                {/* Mobile View */}
                                <div className="md:hidden space-y-4">
                                    {DIAS_SEMANA.map((dia, dayIndex) => {
                                        const daySchedule = horario.schedule[dayIndex];
                                        if (!daySchedule || Object.keys(daySchedule).length === 0) return null;

                                        const blockIndices = Object.keys(daySchedule).map(Number).sort((a, b) => a - b);
                                        const visibleBlocks = [];
                                        let coveredUntil = -1;
                                        for (const blockIndex of blockIndices) {
                                            if (blockIndex > coveredUntil) {
                                                const block = daySchedule[blockIndex];
                                                if (block) {
                                                    visibleBlocks.push({ blockIndex, block });
                                                    coveredUntil = blockIndex + (block.duracion || 1) - 1;
                                                }
                                            }
                                        }

                                        if (visibleBlocks.length === 0) return null;

                                        return (
                                            <div key={dia}>
                                                <h4 className="font-semibold text-sm mb-2 border-b pb-1">{dia}</h4>
                                                <div className="space-y-2">
                                                    {visibleBlocks.map(({ blockIndex, block }) => {
                                                        const materia = materias.find(m => m.id === block.materiaId);
                                                        const docente = users.find(u => u.id === block.docenteId);
                                                        const horaInicio = HORAS_BLOQUE[blockIndex];
                                                        const duracion = block.duracion || 1;
                                                        return (
                                                            <div key={blockIndex} className="p-2 rounded-md bg-muted/50 text-sm">
                                                                <p className="font-bold">{materia?.materia || 'Materia no encontrada'}</p>
                                                                <p className="text-xs text-muted-foreground">{docente?.name || 'Docente no encontrado'}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {horaInicio} ({duracion}h)
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop View */}
                                <Table className="hidden md:table border table-fixed w-full">
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
                <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-radix-popper-content-wrapper]')) {
                        e.preventDefault();
                    }
                }}>
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
    const firestore = useFirestore();
    const { toast } = useToast();

    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: modalidadesData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'modalidades'), [firestore]));
    const { data: sedesData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'sedes'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: materiaAsignacionesData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    const { data: horariosData } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
    const { data: usersData } = useCollection<User>(useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore]));
    
    const carreras = carrerasData || [];
    const modalidades = modalidadesData || [];
    const sedes = sedesData || [];
    const grupos = gruposData || [];
    const materiaAsignaciones = materiaAsignacionesData || [];
    const horarios = horariosData || [];
    const users = usersData || [];

    const createFirestoreCrudHandlers = (collectionName: string, singularName: string) => ({
        onAdd: async (name: string) => {
            try {
                await addDoc(collection(firestore, collectionName), { name });
                toast({ title: `${singularName} agregado` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo agregar el ${singularName.toLowerCase()}.` });
            }
        },
        onEdit: async (id: string, name: string) => {
            try {
                await updateDoc(doc(firestore, collectionName, id), { name });
                toast({ title: `${singularName} actualizado` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el ${singularName.toLowerCase()}.` });
            }
        },
        onDelete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, collectionName, id));
                toast({ title: `${singularName} eliminado` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el ${singularName.toLowerCase()}.` });
            }
        },
    });

    const carrerasHandlers = createFirestoreCrudHandlers('carreras', 'Carrera');
    const modalidadesHandlers = createFirestoreCrudHandlers('modalidades', 'Modalidad');
    const sedesHandlers = createFirestoreCrudHandlers('sedes', 'Sede');

    return (
        <Tabs defaultValue="carreras" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="modalidades">Modalidades</TabsTrigger>
                <TabsTrigger value="sedes">Sedes</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="horarios">Horarios</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras"><CatalogContent title="Carreras" items={carreras} {...carrerasHandlers} /></TabsContent>
            <TabsContent value="modalidades"><CatalogContent title="Modalidades" items={modalidades} {...modalidadesHandlers} /></TabsContent>
            <TabsContent value="sedes"><CatalogContent title="Sedes" items={sedes} {...sedesHandlers} /></TabsContent>
            <TabsContent value="grupos"><GruposContent firestore={firestore} grupos={grupos} carreras={carreras} modalidades={modalidades} sedes={sedes} /></TabsContent>
            <TabsContent value="materias"><MateriasContent firestore={firestore} asignaciones={materiaAsignaciones} carreras={carreras} /></TabsContent>
            <TabsContent value="horarios"><HorariosContent firestore={firestore} horarios={horarios} grupos={grupos} materias={materiaAsignaciones} users={users} /></TabsContent>
        </Tabs>
    );
}

    