"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';


interface Justificacion { 
    id: string; 
    studentId: string; 
    date: string; 
    reason: string; 
    status: 'Pendiente' | 'Aprobado' | 'Rechazado'; 
    attendanceRecordId: string;
    docenteId: string;
    materiaId: string;
}
interface Student { id: string; firstName: string; lastName: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string; }
interface AsignacionMateria { id: string; materia: string; }
interface User { id: string; role: string; }

export default function TeacherJustificacionesPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const { data: justificacionesData } = useCollection<Justificacion>(useMemoFirebase(() => collection(firestore, 'justificaciones'), [firestore]));
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    
    const justificaciones = justificacionesData || [];
    const students = studentsData || [];
    const materias = materiasData || [];

    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, []);

    const pendingJustificaciones = useMemo(() => {
        if (!user) return [];
    
        if (user.role === 'Admin' || user.role === 'Jefe de carrera') {
            return justificaciones.filter(j => j.status === 'Pendiente');
        }
    
        if (user.role === 'Docente') {
            return justificaciones.filter(j => j.status === 'Pendiente' && j.docenteId === user.id);
        }
        
        return [];
    }, [user, justificaciones]);

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
    };
    
    const getMateriaName = (materiaId: string) => {
        const materia = materias.find(m => m.id === materiaId);
        return materia ? materia.materia : 'Desconocida';
    };

    const handleStatusChange = async (justificacionId: string, newStatus: 'Aprobado' | 'Rechazado') => {
        const justificacion = justificaciones.find(j => j.id === justificacionId);
        if (!justificacion) return;

        const justificacionRef = doc(firestore, 'justificaciones', justificacionId);
        
        try {
            if (newStatus === 'Aprobado') {
                const attendanceRef = doc(firestore, 'attendance', justificacion.attendanceRecordId);
                await updateDoc(attendanceRef, { status: 'Falta Justificada' });
            }
            
            await updateDoc(justificacionRef, { status: newStatus });

            toast({
                title: `Justificación ${newStatus === 'Aprobado' ? 'Aprobada' : 'Rechazada'}`,
                description: `El estado de la justificación ha sido actualizado.`,
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.'});
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Panel de Justificaciones</CardTitle>
                    <CardDescription>Revisa y gestiona las solicitudes de justificación de faltas de los alumnos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Materia</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingJustificaciones.length > 0 ? pendingJustificaciones.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{getStudentName(item.studentId)}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{getMateriaName(item.materiaId)}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'Aprobado')}>Aprobar</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleStatusChange(item.id, 'Rechazado')}>Rechazar</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No hay justificaciones pendientes.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
