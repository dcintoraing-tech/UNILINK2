"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Users } from 'lucide-react';

// --- DATA PERSISTENCE & TYPES ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.log(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
                window.dispatchEvent(new StorageEvent('storage', { key }));
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === key && event.newValue) {
                try {
                    setStoredValue(JSON.parse(event.newValue));
                } catch(e) {
                    console.log(e);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [key]);

    return [storedValue, setValue];
};

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    controlNumber: string;
    academicProgramId: string;
    assignedGroupId: string;
    facialImage: string | null;
}

interface Grupo {
    id: string;
    name: string;
}

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

interface AttendanceConfig {
    toleranceMinutes: number;
    absenceLimitMinutes: number;
}

type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta';

interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    materiaAsignacionId: string;
    status: AttendanceStatus;
}

const HORAS_BLOQUE_INICIO = ["07:00", "08:00", "09:00", "10:00"];

export default function TeacherAttendancePage() {
    const { toast } = useToast();
    
    // --- Local Storage Data ---
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [config] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    
    // --- Component State ---
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});

    const studentsInGroup = useMemo(() => {
        if (!selectedGroup) return [];
        return allStudents.filter(s => s.assignedGroupId === selectedGroup);
    }, [selectedGroup, allStudents]);

    useEffect(() => {
        // Reset attendance when group changes
        setAttendanceData({});
    }, [selectedGroup]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceData(prev => ({...prev, [studentId]: status }));
    };

    const getStatusVariant = (status: AttendanceStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            default: return 'outline';
        }
    };
    
    const handleSaveAttendance = () => {
        if (!selectedGroup) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un grupo.' });
            return;
        }

        const now = new Date();
        const groupHorario = horarios.find(h => h.grupoId === selectedGroup);
        if (!groupHorario || !groupHorario.schedule) {
            toast({ variant: 'destructive', title: 'Error', description: 'Este grupo no tiene un horario definido.' });
            return;
        }

        const todayIndex = now.getDay() - 1; // Monday is 1 -> 0
        if (todayIndex < 0 || todayIndex > 4) {
            toast({ variant: 'destructive', title: 'Error', description: 'El pase de lista solo está disponible de Lunes a Viernes.' });
            return;
        }
        
        const todaySchedule = groupHorario.schedule[todayIndex];
        if (!todaySchedule) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay clases programadas para este grupo hoy.' });
            return;
        }

        let currentMateriaId: string | null = null;

        for (const blockIndexStr in todaySchedule) {
            const blockIndex = parseInt(blockIndexStr);
            const block = todaySchedule[blockIndex];
            
            if (block) {
                const horaInicio = HORAS_BLOQUE_INICIO[blockIndex];
                if (!horaInicio) continue;

                const [hours, minutes] = horaInicio.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const endTime = new Date(startTime);
                endTime.setHours(startTime.getHours() + (block.duracion || 1));
                
                if (now >= startTime && now < endTime) {
                    currentMateriaId = block.materiaId;
                    break;
                }
            }
        }
        
        if (!currentMateriaId) {
            toast({ variant: 'destructive', title: 'Fuera de horario', description: 'No hay una clase activa en este momento para este grupo.' });
            return;
        }

        const nowTime = now.getTime();
        const dateString = now.toISOString().split('T')[0];
        let recordsToUpdateCount = 0;
        
        const updatedAttendance = [...attendance];

        studentsInGroup.forEach(student => {
            let status = attendanceData[student.id];

            if (!status) {
                // If no manual status, determine automatically
                const [classStartHours, classStartMinutes] = HORAS_BLOQUE_INICIO.find((h, i) => todaySchedule[i]?.materiaId === currentMateriaId)?.split(':').map(Number) || [0,0];
                const startTime = new Date(now).setHours(classStartHours, classStartMinutes, 0, 0);
                const toleranceTime = new Date(startTime).setMinutes(classStartMinutes + config.toleranceMinutes);
                
                if (nowTime > toleranceTime) {
                    status = 'Retardo';
                } else {
                    status = 'Falta'; // Default to Falta if not marked and past tolerance
                }
            }
            
            if (attendanceData[student.id]) { // Only save if manually set
                 const recordId = `att-${student.id}-${dateString}-${currentMateriaId}`;
                const existingIndex = updatedAttendance.findIndex(r => r.id === recordId);
    
                const newRecord: AttendanceRecord = {
                    id: recordId,
                    studentId: student.id,
                    date: dateString,
                    materiaAsignacionId: currentMateriaId!,
                    status: status,
                };
                
                if (existingIndex > -1) {
                    updatedAttendance[existingIndex] = newRecord;
                } else {
                    updatedAttendance.push(newRecord);
                }
                recordsToUpdateCount++;
            }
        });

        if (recordsToUpdateCount > 0) {
            setAttendance(updatedAttendance);
            toast({ title: 'Asistencia Guardada', description: `Se han actualizado ${recordsToUpdateCount} registros de asistencia.` });
        } else {
            toast({ title: 'Sin cambios', description: 'No se marcó ninguna asistencia nueva.' });
        }
    };


    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pase de Lista</CardTitle>
                    <CardDescription>Selecciona un grupo para registrar la asistencia de sus alumnos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Select onValueChange={setSelectedGroup} value={selectedGroup}>
                        <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                            <SelectValue placeholder="Selecciona un grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                             {grupos.length > 0 ? (
                                grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)
                            ) : (
                                <p className="p-4 text-sm text-muted-foreground">No hay grupos creados.</p>
                            )}
                        </SelectContent>
                    </Select>
                    {selectedGroup && (
                        <div className="flex justify-end">
                            <Button onClick={handleSaveAttendance}>Guardar Asistencia</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedGroup && (
                <Card>
                    <CardHeader>
                        <CardTitle>Alumnos de {grupos.find(g => g.id === selectedGroup)?.name}</CardTitle>
                        <CardDescription>Marca la asistencia para cada alumno.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {studentsInGroup.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Estudiante</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsInGroup.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={student.facialImage || undefined} alt={student.firstName} />
                                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                                                        <div className="text-sm text-muted-foreground">{student.controlNumber}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button 
                                                    size="sm" 
                                                    variant={attendanceData[student.id] === 'Presente' ? 'default' : 'outline'}
                                                    onClick={() => handleStatusChange(student.id, 'Presente')}>
                                                    Presente
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant={attendanceData[student.id] === 'Retardo' ? 'secondary' : 'outline'}
                                                    onClick={() => handleStatusChange(student.id, 'Retardo')}>
                                                    Retardo
                                                </Button>
                                                 <Button 
                                                    size="sm" 
                                                    variant={attendanceData[student.id] === 'Falta' ? 'destructive' : 'outline'}
                                                    onClick={() => handleStatusChange(student.id, 'Falta')}>
                                                    Falta
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                       ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                                <Users className="w-12 h-12 mb-4"/>
                                <p>No hay estudiantes registrados en este grupo.</p>
                            </div>
                       )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
