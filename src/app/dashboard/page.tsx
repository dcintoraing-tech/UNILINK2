"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


interface User {
    id: string;
    name: string;
    role: 'Docente' | 'Admin';
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

interface Grupo {
    id: string;
    name: string;
    carreraId: string;
    turno: string;
}
interface AsignacionMateria {
    id: string;
    materia: string;
}
interface Student {
    id: string;
    firstName: string;
    lastName: string;
    controlNumber: string;
    assignedGroupId: string;
    facialImage: string | null;
}

const HORAS_BLOQUE_INICIO = ["07:00", "08:00", "09:00", "10:00"];

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const firestore = useFirestore();

  const { data: horariosData } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
  const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
  const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
  const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));

  const horarios = horariosData || [];
  const grupos = gruposData || [];
  const materias = materiasData || [];
  const students = studentsData || [];
  
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<Grupo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('unilink-user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, []);

  const assignedGroups = useMemo(() => {
    if (!user || user.role !== 'Docente') return [];

    return grupos.map(group => {
        const subjects = new Set<string>();
        let earliestTime = '24:00';
        
        horarios.forEach(horario => {
            if (horario.grupoId === group.id && horario.schedule) {
                 Object.values(horario.schedule).forEach(daySchedule => {
                    if (daySchedule) {
                        Object.entries(daySchedule).forEach(([blockIndex, block]) => {
                            if (block) {
                                // A teacher sees all subjects for all groups.
                                const materia = materias.find(m => m.id === block.materiaId);
                                if (materia) subjects.add(materia.materia);
                                
                                const horaInicio = HORAS_BLOQUE_INICIO[parseInt(blockIndex)];
                                if (horaInicio && horaInicio < earliestTime) {
                                    earliestTime = horaInicio;
                                }
                            }
                        });
                    }
                });
            }
        });

        const studentCount = students.filter(s => s.assignedGroupId === group.id).length;

        return {
            ...group,
            subjects: Array.from(subjects),
            scheduleInfo: `Inicia ${earliestTime === '24:00' ? 'N/A' : earliestTime}`,
            studentCount,
        };
    }).filter((g): g is NonNullable<typeof g> => g !== null);
  }, [user, horarios, grupos, materias, students]);

  const studentsInViewingGroup = useMemo(() => {
    if (!viewingGroup) return [];
    return students.filter(s => s.assignedGroupId === viewingGroup.id);
  }, [viewingGroup, students]);

  const handleViewGroupStudents = (group: Grupo) => {
      setViewingGroup(group);
      setIsStudentListOpen(true);
  };
  
  if (!user) {
    return <p>Cargando...</p>;
  }

  return (
    <>
        <div className="grid gap-6">
            <div className="grid gap-2">
                <h1 className="text-3xl font-semibold">¡Bienvenido, {user.name}!</h1>
                <p className="text-muted-foreground">
                    Como Docente, tienes acceso a todos los grupos para facilitar las pruebas del sistema.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Grupos</CardTitle>
                    <CardDescription>Resumen de todos los grupos y materias del sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {assignedGroups.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {assignedGroups.map(group => (
                                <Card key={group.id} className="cursor-pointer hover:border-primary" onClick={() => handleViewGroupStudents(group)}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{group.name}</CardTitle>
                                        <CardDescription>Turno {group.turno}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-2">Materias</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {group.subjects.length > 0 
                                                    ? group.subjects.map(subject => <Badge key={subject} variant="secondary">{subject}</Badge>)
                                                    : <p className="text-xs text-muted-foreground">Sin materias asignadas</p>
                                                }
                                            </div>
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Clock className="mr-2 h-4 w-4" />
                                            <span>{group.scheduleInfo}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>{group.studentCount} estudiantes</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                            <Users className="w-12 h-12 mb-4"/>
                            <p>No se encontraron grupos.</p>
                            <p className="text-xs">
                                Crea grupos y asígnales horarios desde el panel de administrador.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Estudiantes en {viewingGroup?.name}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Número de Control</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentsInViewingGroup.length > 0 ? (
                                studentsInViewingGroup.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={student.facialImage || undefined} />
                                                    <AvatarFallback><UserIcon /></AvatarFallback>
                                                </Avatar>
                                                <span>{student.firstName} {student.lastName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.controlNumber}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No hay estudiantes en este grupo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
}
