"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

interface Justificacion { 
    id: string; 
    studentId: string;
    date: string; 
    reason: string; 
    status: 'Pendiente' | 'Aprobado' | 'Rechazado'; 
    attendanceRecordId: string;
}
interface Student { id: string; firstName: string; lastName: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; }

export default function JustificacionesPage() {
    const { toast } = useToast();
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    const [students] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
    };

    const handleStatusChange = (justificacionId: string, newStatus: 'Aprobado' | 'Rechazado') => {
        let attendanceUpdated = false;
        const updatedJustificaciones = justificaciones.map(j => {
            if (j.id === justificacionId) {
                // If approving, update the corresponding attendance record
                if (newStatus === 'Aprobado') {
                    const updatedAttendance = attendance.map(a => {
                        if (a.id === j.attendanceRecordId) {
                            attendanceUpdated = true;
                            return { ...a, status: 'Falta Justificada' as AttendanceStatus };
                        }
                        return a;
                    });
                    if (attendanceUpdated) {
                        setAttendance(updatedAttendance);
                    }
                }
                return { ...j, status: newStatus };
            }
            return j;
        });

        setJustificaciones(updatedJustificaciones);
        toast({
            title: `Justificación ${newStatus === 'Aprobado' ? 'Aprobada' : 'Rechazada'}`,
            description: `El estado de la justificación ha sido actualizado.`,
        });
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
                            {justificaciones.map(item => (
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
                             {justificaciones.length === 0 && (
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
