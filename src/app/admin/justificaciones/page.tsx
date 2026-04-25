
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

export default function JustificacionesPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const { data: justificaciones } = useCollection<Justificacion>(useMemoFirebase(() => collection(firestore, 'justificaciones'), [firestore]));
    const { data: students } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));

    const pendingJustificaciones = useMemo(() => {
        return (justificaciones || []).filter(j => j.status === 'Pendiente');
    }, [justificaciones]);

    const getStudentName = (studentId: string) => {
        const student = (students || []).find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
    };

    const handleStatusChange = async (justificacionId: string, newStatus: 'Aprobado' | 'Rechazado') => {
        const justificacion = (justificaciones || []).find(j => j.id === justificacionId);
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
            window.location.reload();
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.'});
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Aprobado': return 'default';
            case 'Pendiente': return 'secondary';
            case 'Rechazado': return 'destructive';
            default: return 'outline';
        }
    };
    
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Justificaciones</CardTitle>
                    <CardDescription>Revisa y aprueba las justificaciones de inasistencia de los estudiantes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingJustificaciones.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{getStudentName(item.studentId)}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {item.status === 'Pendiente' && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'Aprobado')}>Aprobar</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleStatusChange(item.id, 'Rechazado')}>Rechazar</Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                             {pendingJustificaciones.length === 0 && (
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
