"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, AlertTriangle, MessageSquare, Save, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

// --- DATA PERSISTENCE & TYPES ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) setStoredValue(JSON.parse(item));
            } catch (error) { console.log(error); }
        }
    }, [key]);
    const setValue = (value: T | ((val: T) => T)) => {
        if (typeof window !== 'undefined') {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) { console.log(error); }
        }
    };
    return [storedValue, setValue];
};

interface User { id: string; name: string; }
interface HorarioBlock { docenteId: string; materiaAsignacionId: string; horaInicio: string; }
interface Horario { grupoId: string; dia: string; blocks: (HorarioBlock | undefined)[]; }
interface Grupo { id: string; name: string; }
interface AsignacionMateria { id: string; materia: string; }
interface Student { id: string; firstName: string; lastName: string; assignedGroupId: string; facialImage: string | null; }
interface Justificacion { id: string; studentId: string; date: string; reason: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; }

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function TeacherAttendancePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data from local storage
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [materias] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [students] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    
    // UI State
    const [today, setToday] = useState(new Date());
    const [selectedClass, setSelectedClass] = useState<string | null>(null); // "groupId-materiaId-horaInicio"
    const [currentAttendance, setCurrentAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
    const [justificationText, setJustificationText] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, []);

    const teacherClassesToday = useMemo(() => {
        if (!user) return [];
        const dayName = DIAS_SEMANA[today.getDay()];
        const classes: { value: string, label: string, groupId: string, materiaId: string }[] = [];
        
        horarios.forEach(horario => {
            if (horario.dia === dayName) {
                horario.blocks.forEach(block => {
                    if (block && block.docenteId === user.id) {
                        const group = grupos.find(g => g.id === horario.grupoId);
                        const materia = materias.find(m => m.id === block.materiaAsignacionId);
                        if (group && materia) {
                            const classId = `${group.id}-${materia.id}-${block.horaInicio}`;
                            classes.push({
                                value: classId,
                                label: `${block.horaInicio} - ${group.name} - ${materia.materia}`,
                                groupId: group.id,
                                materiaId: materia.id,
                            });
                        }
                    }
                });
            }
        });
        return classes.sort((a,b) => a.label.localeCompare(b.label));
    }, [user, horarios, grupos, materias, today]);

    const { selectedGroupId, selectedMateriaId } = useMemo(() => {
        if (!selectedClass) return { selectedGroupId: null, selectedMateriaId: null };
        const [groupId, materiaId] = selectedClass.split('-');
        return { selectedGroupId: groupId, selectedMateriaId: materiaId };
    }, [selectedClass]);

    const studentsInSelectedGroup = useMemo(() => {
        if (!selectedGroupId) return [];
        return students.filter(s => s.assignedGroupId === selectedGroupId);
    }, [students, selectedGroupId]);

    useEffect(() => {
        const newAttendance = new Map<string, AttendanceStatus>();
        if (selectedGroupId && selectedMateriaId) {
            const dateString = today.toISOString().split('T')[0];
            studentsInSelectedGroup.forEach(student => {
                const record = attendance.find(a => 
                    a.studentId === student.id && 
                    a.date === dateString &&
                    a.materiaAsignacionId === selectedMateriaId
                );
                if (record) {
                    newAttendance.set(student.id, record.status);
                }
            });
        }
        setCurrentAttendance(newAttendance);
    }, [selectedClass, studentsInSelectedGroup, attendance, today, selectedMateriaId]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setCurrentAttendance(prev => new Map(prev).set(studentId, status));
    };

    const handleSaveJustification = (studentId: string) => {
        if (!justificationText.trim()) {
            toast({ variant: 'destructive', title: 'Justificación vacía', description: 'Por favor, escribe un motivo.' });
            return;
        }
        if (!selectedMateriaId) return;

        const dateString = today.toISOString().split('T')[0];
        const attendanceRecordId = `att-${studentId}-${dateString}-${selectedMateriaId}`;

        const newJustification: Justificacion = {
            id: `just-${Date.now()}`,
            studentId,
            date: dateString,
            reason: justificationText,
            status: 'Pendiente',
            attendanceRecordId,
        };
        setJustificaciones(prev => [...prev, newJustification]);
        handleStatusChange(studentId, 'Falta Justificada');
        setJustificationText('');
        toast({ title: 'Justificación guardada', description: 'La justificación ha sido enviada para su revisión.' });
        return true; // to close dialog
    };
    
    const handleSaveAttendance = () => {
        if (!selectedGroupId || !selectedMateriaId) return;
        const dateString = today.toISOString().split('T')[0];

        const updatedAttendance = [...attendance];
        
        currentAttendance.forEach((status, studentId) => {
            const recordId = `att-${studentId}-${dateString}-${selectedMateriaId}`;
            const existingRecordIndex = updatedAttendance.findIndex(rec => rec.id === recordId);
            
            const newRecord: AttendanceRecord = {
                id: recordId,
                studentId,
                date: dateString,
                materiaAsignacionId: selectedMateriaId,
                status,
            };

            if (existingRecordIndex > -1) {
                updatedAttendance[existingRecordIndex] = newRecord;
            } else {
                updatedAttendance.push(newRecord);
            }
        });
        
        setAttendance(updatedAttendance);
        toast({ title: 'Asistencia Guardada', description: 'Los registros de asistencia han sido actualizados.' });
    };

    const getStatusVariant = (status?: AttendanceStatus) => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            case 'Falta Justificada': return 'outline';
            default: return 'ghost';
        }
    };
    
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pase de Asistencia</CardTitle>
                    <CardDescription>Selecciona una clase para registrar la asistencia de hoy: {today.toLocaleDateString()}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {teacherClassesToday.length > 0 ? (
                        <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
                            <SelectTrigger className="w-full md:w-1/2">
                                <SelectValue placeholder="Selecciona una clase..." />
                            </SelectTrigger>
                            <SelectContent>
                                {teacherClassesToday.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                            <AlertTriangle className="w-12 h-12 mb-4"/>
                            <p>No tienes clases programadas para hoy.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedClass && studentsInSelectedGroup.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Estudiantes</CardTitle>
                        <CardDescription>Marca la asistencia para cada estudiante.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {studentsInSelectedGroup.map(student => {
                            const status = currentAttendance.get(student.id);
                            return (
                                <div key={student.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={student.facialImage || undefined} alt={`${student.firstName} ${student.lastName}`} />
                                            <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                                            {status && <Badge variant={getStatusVariant(status)} className="mt-1">{status}</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant={status === 'Presente' ? 'default' : 'outline'} onClick={() => handleStatusChange(student.id, 'Presente')}><Check className="h-4 w-4" /></Button>
                                        <Button size="icon" variant={status === 'Retardo' ? 'secondary' : 'outline'} onClick={() => handleStatusChange(student.id, 'Retardo')}><Clock className="h-4 w-4" /></Button>
                                        <Button size="icon" variant={status === 'Falta' ? 'destructive' : 'outline'} onClick={() => handleStatusChange(student.id, 'Falta')}><X className="h-4 w-4" /></Button>
                                        <Dialog onOpenChange={(open) => !open && setJustificationText('')}>
                                            <DialogTrigger asChild>
                                                <Button size="icon" variant={status === 'Falta Justificada' ? 'outline' : 'ghost'} className={status === 'Falta Justificada' ? 'border-blue-500' : ''}><MessageSquare className="h-4 w-4" /></Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Justificar Falta</DialogTitle>
                                                    <DialogDescription>
                                                        Agrega un motivo para la ausencia de {student.firstName} {student.lastName}. Esto se enviará para aprobación.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Textarea placeholder="Ej. Cita médica, problema familiar..." value={justificationText} onChange={(e) => setJustificationText(e.target.value)} />
                                                <DialogFooter>
                                                    <Button onClick={() => handleSaveJustification(student.id)}>Guardar Justificación</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveAttendance}><Save className="mr-2 h-4 w-4" />Guardar Asistencias</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
