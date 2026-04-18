"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface Justificacion { id: string; studentId: string; date: string; reason: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; }
interface Student { id: string; firstName: string; lastName: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; }

export default function TeacherJustificacionesPage() {
    const { toast } = useToast();
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    const [students] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [user, setUser] = useState<{role: string} | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, []);

    const pendingJustificaciones = useMemo(() => {
        if (user?.role !== 'Docente' && user?.role !== 'Jefe de carrera' && user?.role !== 'Admin') return [];
        return justificaciones.filter(j => j.status === 'Pendiente');
    }, [user, justificaciones]);

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
    };
    
    const handleStatusChange = (justificacionId: string, newStatus: 'Aprobado' | 'Rechazado') => {
        let attendanceUpdated = false;
        const updatedJustificaciones = justificaciones.map(j => {
            if (j.id === justificacionId) {
                if (newStatus === 'Aprobado') {
                    const updatedAttendance = attendance.map(a => {
                        if (a.id === j.attendanceRecordId && a.status === 'Falta') {
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
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingJustificaciones.length > 0 ? pendingJustificaciones.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{getStudentName(item.studentId)}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'Aprobado')}>Aprobar</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleStatusChange(item.id, 'Rechazado')}>Rechazar</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No hay justificaciones pendientes.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
