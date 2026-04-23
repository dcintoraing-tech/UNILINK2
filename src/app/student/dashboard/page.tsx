"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sub, format, eachDayOfInterval, startOfDay } from 'date-fns';
import Link from 'next/link';
import { es } from 'date-fns/locale';

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

interface Student { id: string; firstName: string; lastName: string; controlNumber: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string;}
interface AsignacionMateria { id: string; materia: string; }
interface Justificacion { id: string; studentId: string; date: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; docenteId: string; materiaId: string; }

interface HorarioBlock {
    materiaId: string;
    docenteId: string;
    duracion: 1 | 2;
}
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [day: number]: DaySchedule };
interface Horario {
    id: string; // Same as grupoId
    grupoId: string;
    schedule: ScheduleData;
}


// --- MAIN COMPONENT ---
export default function StudentDashboardPage() {
    const { toast } = useToast();
    // Student Access State
    const [student, setStudent] = useState<Student | null>(null);
    const [controlNumberInput, setControlNumberInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Data from LocalStorage
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [allAttendance, setAllAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [allSubjects] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [allJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    const [allHorarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [mockDataGenerated, setMockDataGenerated] = useLocalStorage('unilink-mock-attendance-generated', false);

    // Check for logged-in student on mount
    useEffect(() => {
        try {
            const storedStudentId = sessionStorage.getItem('unilink-student-id');
            if (storedStudentId) {
                const foundStudent = allStudents.find(s => s.id === storedStudentId);
                if (foundStudent) {
                    setStudent(foundStudent);
                }
            }
        } catch (e) {
            console.error("Could not access session storage:", e);
        } finally {
            setIsLoading(false);
        }
    }, [allStudents]);

    // Generate mock data if it hasn't been done before
    useEffect(() => {
        if (student && !mockDataGenerated && allStudents.length > 0 && allHorarios.length > 0) {
            const newAttendance: AttendanceRecord[] = [];
            const twoMonthsAgo = sub(new Date(), { months: 2 });
            const today = new Date();
            const dateInterval = eachDayOfInterval({ start: twoMonthsAgo, end: today });

            allStudents.forEach(s => {
                const studentHorarios = allHorarios.filter(h => h.grupoId === (s as any).assignedGroupId);
                if (studentHorarios.length === 0) return;
                
                let absences = Math.floor(Math.random() * 6) + 5; // 5 to 10 absences
                let lates = Math.floor(Math.random() * 4) + 2; // 2 to 5 lates

                for (const date of dateInterval) {
                    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() -1;
                    let recordAddedForDate = false;

                    for(const horario of studentHorarios){
                        if(recordAddedForDate) break;
                        const daySchedule = horario.schedule[dayIndex];
                        if(daySchedule){
                           const blockEntries = Object.values(daySchedule).filter(Boolean) as HorarioBlock[];
                           if(blockEntries.length > 0){
                                const randomBlock = blockEntries[Math.floor(Math.random() * blockEntries.length)];
                                const dateString = format(startOfDay(date), 'yyyy-MM-dd');
                                
                                let status: AttendanceStatus | null = null;
                                if (absences > 0 && Math.random() > 0.85) { 
                                    status = 'Falta';
                                    absences--;
                                } else if (lates > 0 && Math.random() > 0.9) {
                                    status = 'Retardo';
                                    lates--;
                                }

                                if (status) {
                                    newAttendance.push({
                                        id: `att-${s.id}-${dateString}-${randomBlock.materiaId}`,
                                        studentId: s.id,
                                        date: dateString,
                                        materiaAsignacionId: randomBlock.materiaId,
                                        docenteId: randomBlock.docenteId,
                                        status: status
                                    });
                                    recordAddedForDate = true;
                                }
                           }
                        }
                    }
                }
            });

            setAllAttendance(prev => [...prev, ...newAttendance]);
            setMockDataGenerated(true);
            toast({ title: "Datos de prueba generados", description: "Se ha creado un historial de asistencia para todos los alumnos." });
        }
    }, [student, mockDataGenerated, allStudents, allHorarios, setAllAttendance, setMockDataGenerated, toast]);

    // Handle student login via control number
    const handleAccess = (e: React.FormEvent) => {
        e.preventDefault();
        const foundStudent = allStudents.find(s => s.controlNumber === controlNumberInput);
        if (foundStudent) {
            sessionStorage.setItem('unilink-student-id', foundStudent.id);
            setStudent(foundStudent);
            toast({ title: `¡Bienvenido, ${foundStudent.firstName}!`, description: "Cargando tu información." });
        } else {
            toast({ variant: 'destructive', title: 'Número de control no válido', description: 'Por favor, verifica tu número de control e inténtalo de nuevo.' });
        }
    };

    // Memoize student's attendance records
    const studentAttendance = useMemo(() => {
        if (!student) return [];
        return allAttendance
            .filter(record => record.studentId === student.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student, allAttendance]);

    const getSubjectName = (materiaId: string) => {
        return allSubjects.find(s => s.id === materiaId)?.materia || 'Materia Desconocida';
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Presente': return { variant: 'default', icon: <CheckCircle className="h-4 w-4" />, text: 'Presente' };
            case 'Retardo': return { variant: 'secondary', icon: <Clock className="h-4 w-4" />, text: 'Retardo' };
            case 'Falta': return { variant: 'destructive', icon: <XCircle className="h-4 w-4" />, text: 'Falta' };
            case 'Falta Justificada': return { variant: 'outline', icon: <FileText className="h-4 w-4" />, text: 'Justificada' };
            default: return { variant: 'outline', icon: null, text: 'N/A' };
        }
    };
    
    if (isLoading) {
        return <div className="flex min-h-screen w-full flex-col items-center justify-center"><p>Cargando...</p></div>;
    }

    if (!student) {
        return (
            <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-screen">
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso de Alumno</CardTitle>
                        <CardDescription>Ingresa tu número de control para ver tu dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAccess} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="control-number">Número de Control</Label>
                                <Input
                                    id="control-number"
                                    value={controlNumberInput}
                                    onChange={(e) => setControlNumberInput(e.target.value)}
                                    placeholder="Ej. 12345678"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Acceder
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                <h1 className="text-3xl font-semibold">Mis Asistencias</h1>
                <p className="text-muted-foreground">Aquí puedes ver un resumen de tus asistencias, retardos y faltas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Asistencia</CardTitle>
                    <CardDescription>Resumen de tus registros por clase.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {studentAttendance.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">No tienes registros de asistencia.</div>
                    )}
                    {studentAttendance.map(record => {
                        const { variant, icon, text } = getStatusInfo(record.status);
                        const hasPendingJustification = allJustificaciones.some(j => j.attendanceRecordId === record.id && j.status === 'Pendiente');
                        const canJustify = record.status === 'Falta' && !hasPendingJustification && !!record.docenteId;

                        return (
                            <div key={record.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium">{getSubjectName(record.materiaAsignacionId)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(record.date), "PPP", { locale: es })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <Badge variant={variant} className="flex items-center gap-2">
                                        {icon}
                                        <span>{text}</span>
                                    </Badge>
                                    {canJustify ? (
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/student/justificaciones?recordId=${record.id}`}>Justificar</Link>
                                        </Button>
                                    ) : hasPendingJustification ? (
                                        <Badge variant="secondary">Justificación Pendiente</Badge>
                                    ) : (
                                        record.status === 'Falta' && <Button size="sm" variant="outline" disabled title="No se puede justificar este registro.">Justificar</Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}

    