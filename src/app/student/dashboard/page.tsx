
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


interface Student { id: string; firstName: string; lastName: string; controlNumber: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string;}
interface AsignacionMateria { id: string; materia: string; }
interface Justificacion { id: string; studentId: string; date: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; docenteId: string; materiaId: string; }


// --- MAIN COMPONENT ---
export default function StudentDashboardPage() {
    const router = useRouter();

    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Data from Firestore
    const firestore = useFirestore();
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    const { data: subjectsData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    const { data: justificacionesData } = useCollection<Justificacion>(useMemoFirebase(() => collection(firestore, 'justificaciones'), [firestore]));
    
    const allStudents = studentsData || [];
    const allAttendance = attendanceData || [];
    const allSubjects = subjectsData || [];
    const allJustificaciones = justificacionesData || [];

    // Check for logged-in student on mount
    useEffect(() => {
        if (!studentsData) return; // Wait for student data to be loaded
        let foundStudent: Student | undefined;
        try {
            const storedStudentId = sessionStorage.getItem('unilink-student-id');
            if (storedStudentId) {
                foundStudent = allStudents.find(s => s.id === storedStudentId);
                if (foundStudent) {
                    setStudent(foundStudent);
                } else {
                    // Invalid ID, clear it and redirect
                    sessionStorage.removeItem('unilink-student-id');
                    router.push('/student-login');
                }
            } else {
                router.push('/student-login');
            }
        } catch (e) {
            console.error("Could not access session storage:", e);
            router.push('/student-login');
        } finally {
            setIsLoading(false);
        }
    }, [allStudents, router, studentsData]);
    
    // Memoize student's attendance records
    const studentAttendance = useMemo(() => {
        if (!student) return [];
        return allAttendance
            .filter(record => record.studentId === student.id)
            .sort((a, b) => {
                try {
                    return new Date(b.date).getTime() - new Date(a.date).getTime()
                } catch(e) {
                    return 0;
                }
            });
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
    
    if (isLoading || !student) {
        return <div className="flex min-h-screen w-full flex-col items-center justify-center"><p>Cargando información del estudiante...</p></div>;
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
                        
                        let disabledTitle = '';
                        if (record.status !== 'Falta') {
                            disabledTitle = 'Solo se pueden justificar las faltas.';
                        } else if (hasPendingJustification) {
                            disabledTitle = 'Ya hay una justificación pendiente para esta falta.';
                        } else if (!record.docenteId) {
                            disabledTitle = 'Esta falta no tiene un docente asignado y no se puede justificar.';
                        }

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
                                        record.status === 'Falta' && <Button size="sm" variant="outline" disabled title={disabledTitle}>Justificar</Button>
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
