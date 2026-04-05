"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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

interface User { id: string; name: string; }
interface HorarioBlock { docenteId: string; materiaAsignacionId: string; horaInicio: string; }
interface Horario { grupoId: string; dia: string; blocks: (HorarioBlock | undefined)[]; }
interface Grupo { id: string; name: string; }
interface AsignacionMateria { id: string; materia: string; }
interface Student { id: string; firstName: string; lastName: string; assignedGroupId: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; }

export default function TeacherReportsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [students] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, []);

    const teacherGroups = useMemo(() => {
        if (!user) return [];
        const groupIds = new Set<string>();
        horarios.forEach(h => h.blocks.forEach(b => {
            if (b?.docenteId === user.id) groupIds.add(h.grupoId);
        }));
        return grupos.filter(g => groupIds.has(g.id));
    }, [user, horarios, grupos]);

    const reportData = useMemo(() => {
        if (!selectedGroup) return null;
        
        const groupStudents = students.filter(s => s.assignedGroupId === selectedGroup);
        const groupAttendance = attendance.filter(a => groupStudents.some(s => s.id === a.studentId));
        
        const studentReports = groupStudents.map(student => {
            const studentRecords = groupAttendance.filter(a => a.studentId === student.id);
            const presents = studentRecords.filter(r => r.status === 'Presente').length;
            const lates = studentRecords.filter(r => r.status === 'Retardo').length;
            const absences = studentRecords.filter(r => r.status === 'Falta').length;
            const justified = studentRecords.filter(r => r.status === 'Falta Justificada').length;
            
            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                presents, lates, absences, justified,
                total: studentRecords.length
            };
        });

        const overall = studentReports.reduce((acc, curr) => ({
            presents: acc.presents + curr.presents,
            lates: acc.lates + curr.lates,
            absences: acc.absences + curr.absences,
            justified: acc.justified + curr.justified,
        }), { presents: 0, lates: 0, absences: 0, justified: 0 });

        const pieData = [
            { name: 'Presente', value: overall.presents, fill: 'hsl(var(--chart-1))' },
            { name: 'Retardo', value: overall.lates, fill: 'hsl(var(--chart-2))' },
            { name: 'Falta', value: overall.absences, fill: 'hsl(var(--destructive))' },
            { name: 'Justificada', value: overall.justified, fill: 'hsl(var(--chart-3))' },
        ].filter(item => item.value > 0);

        return { studentReports, pieData };

    }, [selectedGroup, students, attendance]);

    return (
         <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reportes de Asistencia</CardTitle>
                    <CardDescription>Selecciona un grupo para ver sus estadísticas de asistencia.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select onValueChange={setSelectedGroup} value={selectedGroup || ''}>
                        <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder="Selecciona un grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                            {teacherGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedGroup && reportData && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Resumen del Grupo</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div>
                             <h3 className="font-semibold mb-4">Detalle por Estudiante</h3>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Estudiante</TableHead>
                                        <TableHead>Asistencias</TableHead>
                                        <TableHead>Retardos</TableHead>
                                        <TableHead>Faltas</TableHead>
                                        <TableHead>Justificadas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.studentReports.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>{student.presents}</TableCell>
                                            <TableCell>{student.lates}</TableCell>
                                            <TableCell>{student.absences}</TableCell>
                                            <TableCell>{student.justified}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex flex-col items-center">
                            <h3 className="font-semibold mb-4">Distribución General</h3>
                             <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                         {reportData.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                             <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {reportData.pieData.map(entry => (
                                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                                        {entry.name} ({entry.value})
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
