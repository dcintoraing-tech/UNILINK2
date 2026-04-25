"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { sub, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';


interface User { id: string; name: string; role: 'Docente' | 'Admin' | 'Jefe de carrera'; carreraId?: string; }
interface Student { id: string; firstName: string; lastName: string; assignedGroupId: string; }
interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string;}
interface AsignacionMateria { id: string; materia: string; }


export default function AdminAttendancePage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    
    const attendance = attendanceData || [];
    const students = studentsData || [];
    const carreras = carrerasData || [];
    const grupos = gruposData || [];
    const materias = materiasData || [];
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [filters, setFilters] = useState({ carreraId: 'all', grupoId: 'all', studentId: 'all' });
    const [editedRecords, setEditedRecords] = useState<Record<string, AttendanceStatus>>({});

    useEffect(() => {
        const storedUser = sessionStorage.getItem('unilink-user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            if (user.role === 'Jefe de carrera' && user.carreraId) {
                setFilters(prev => ({ ...prev, carreraId: user.carreraId, grupoId: 'all', studentId: 'all' }));
            }
        }
        setDateRange({ from: sub(new Date(), { days: 7 }), to: new Date() });
    }, []);

    const isJefe = currentUser?.role === 'Jefe de carrera';

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'carreraId') {
                newFilters.grupoId = 'all';
                newFilters.studentId = 'all';
            }
            if (filterName === 'grupoId') {
                newFilters.studentId = 'all';
            }
            return newFilters;
        });
    };
    
    const { carrerasForFilter, gruposForFilter, studentsForFilter } = useMemo(() => {
        const c = isJefe && currentUser?.carreraId ? carreras.filter(c => c.id === currentUser.carreraId) : carreras;
        const g = filters.carreraId === 'all' ? grupos : grupos.filter(g => g.carreraId === filters.carreraId);
        const s = filters.grupoId === 'all' 
            ? (filters.carreraId === 'all' ? students : students.filter(s => g.some(grp => grp.id === s.assignedGroupId)))
            : students.filter(s => s.assignedGroupId === filters.grupoId);
            
        return { carrerasForFilter: c, gruposForFilter: g, studentsForFilter: s };
    }, [filters, isJefe, currentUser, carreras, grupos, students]);

    const displayedAttendance = useMemo(() => {
        const startDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const endDate = dateRange?.to ? endOfDay(dateRange.to) : null;

        return attendance.filter(record => {
            let recordDate;
            try {
                recordDate = parseISO(record.date);
            } catch (e) {
                return false; // Ignore invalid dates
            }

            const isDateMatch = startDate && endDate ? (recordDate >= startDate && recordDate <= endDate) : true;
            if (!isDateMatch) return false;
            
            const student = students.find(s => s.id === record.studentId);
            if (!student) return false;

            const group = grupos.find(g => g.id === student.assignedGroupId);
            if (!group) return false;

            const isCarreraMatch = filters.carreraId === 'all' || group.carreraId === filters.carreraId;
            const isGrupoMatch = filters.grupoId === 'all' || group.id === filters.grupoId;
            const isStudentMatch = filters.studentId === 'all' || record.studentId === filters.studentId;

            return isCarreraMatch && isGrupoMatch && isStudentMatch;
        }).sort((a, b) => {
            try {
                return new Date(b.date).getTime() - new Date(a.date).getTime()
            } catch(e) {
                return 0;
            }
        });
    }, [attendance, students, grupos, dateRange, filters]);
    
    const handleStatusChange = (recordId: string, newStatus: AttendanceStatus) => {
        setEditedRecords(prev => ({ ...prev, [recordId]: newStatus }));
    };

    const handleSaveChanges = async () => {
        if (Object.keys(editedRecords).length === 0) return;
        const batch = writeBatch(firestore);

        Object.entries(editedRecords).forEach(([recordId, newStatus]) => {
            const recordRef = doc(firestore, 'attendance', recordId);
            batch.update(recordRef, { status: newStatus });
        });

        try {
            await batch.commit();
            setEditedRecords({});
            toast({ title: "Asistencias actualizadas", description: "Los cambios han sido guardados." });
        } catch (error) {
            console.error("Error updating attendance:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        }
    };

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'N/A';
    };
    
    const getMateriaName = (materiaId: string) => {
        return materias.find(m => m.id === materiaId)?.materia || 'N/A';
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Asistencias</CardTitle>
                    <CardDescription>Filtra y corrige los registros de asistencia de los estudiantes.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                        <Label>Rango de Fechas</Label>
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Carrera</Label>
                        <Select onValueChange={(v) => handleFilterChange('carreraId', v)} value={filters.carreraId} disabled={isJefe}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Carreras</SelectItem>
                                {carrerasForFilter.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Grupo</Label>
                        <Select onValueChange={(v) => handleFilterChange('grupoId', v)} value={filters.grupoId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Grupos</SelectItem>
                                {gruposForFilter.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Estudiante</Label>
                        <Select onValueChange={(v) => handleFilterChange('studentId', v)} value={filters.studentId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Estudiantes</SelectItem>
                                {studentsForFilter.map(s => <SelectItem key={s.id} value={s.id}>{`${s.firstName} ${s.lastName}`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Registros de Asistencia</CardTitle>
                        <Button onClick={handleSaveChanges} disabled={Object.keys(editedRecords).length === 0}>
                            Guardar Cambios ({Object.keys(editedRecords).length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Materia</TableHead>
                                <TableHead>Estado Original</TableHead>
                                <TableHead>Nuevo Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedAttendance.length > 0 ? displayedAttendance.map(record => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">{getStudentName(record.studentId)}</TableCell>
                                    <TableCell>{format(parseISO(record.date), "PPP", { locale: es })}</TableCell>
                                    <TableCell>{getMateriaName(record.materiaAsignacionId)}</TableCell>
                                    <TableCell>{record.status}</TableCell>
                                    <TableCell className="w-[200px]">
                                        <Select
                                            value={editedRecords[record.id] || record.status}
                                            onValueChange={(val) => handleStatusChange(record.id, val as AttendanceStatus)}
                                        >
                                            <SelectTrigger />
                                            <SelectContent>
                                                <SelectItem value="Presente">Presente</SelectItem>
                                                <SelectItem value="Retardo">Retardo</SelectItem>
                                                <SelectItem value="Falta">Falta</SelectItem>
                                                <SelectItem value="Falta Justificada">Falta Justificada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No se encontraron registros con los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{displayedAttendance.length}</strong> registros.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
