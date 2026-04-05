"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada'; }
interface User { id: string; name: string; }

interface HorarioBlock {
    materiaId: string;
    docenteId: string;
    duracion: 1 | 2;
}
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [dayIndex: number]: DaySchedule };
interface Horario {
    id: string;
    grupoId: string;
    schedule: ScheduleData;
}


export default function TeacherJustificacionesPage() {
    const [justificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    const [students] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [user, setUser] = useState<User | null>(null);
    const [activeRole, setActiveRole] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            const storedRole = sessionStorage.getItem('unilink-active-role');
            if (storedUser) setUser(JSON.parse(storedUser));
            if (storedRole) setActiveRole(storedRole);
        }
    }, []);

    const teacherJustificaciones = useMemo(() => {
        if (!user) return [];
        if (activeRole === 'Super Docente') return justificaciones;
        
        const teacherMateriaIds = new Set<string>();
        horarios.forEach(h => {
            if (h.schedule) {
                Object.values(h.schedule).forEach(day => {
                    if (day) {
                        Object.values(day).forEach(block => {
                            if (block?.docenteId === user.id) {
                                teacherMateriaIds.add(block.materiaId);
                            }
                        });
                    }
                });
            }
        });

        const teacherAttendanceRecordIds = new Set<string>();
        attendance.forEach(a => {
            if (teacherMateriaIds.has(a.materiaAsignacionId)) {
                teacherAttendanceRecordIds.add(a.id);
            }
        });
        
        return justificaciones.filter(j => {
            const attendanceRecord = attendance.find(a => a.id === j.attendanceRecordId);
            if (!attendanceRecord) return false;
            return teacherMateriaIds.has(attendanceRecord.materiaAsignacionId);
        });

    }, [user, activeRole, justificaciones, attendance, horarios]);

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
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
                    <CardTitle>Mis Justificaciones Enviadas</CardTitle>
                    <CardDescription>Aquí puedes ver el estado de las justificaciones que has registrado para tus estudiantes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teacherJustificaciones.length > 0 ? teacherJustificaciones.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{getStudentName(item.studentId)}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No has enviado ninguna justificación.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
