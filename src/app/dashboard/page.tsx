"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';

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

interface User {
    id: string;
    name: string;
    role: 'Docente' | 'Admin' | 'Super Docente';
}
interface HorarioBlock {
    docenteId: string;
    materiaAsignacionId: string;
    horaInicio: string;
    duracion: string;
}
interface Horario {
    id:string;
    grupoId: string;
    dia: string;
    blocks: (HorarioBlock | undefined)[];
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
    assignedGroupId: string;
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState('');
  const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
  const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
  const [materias] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
  const [students] = useLocalStorage<Student[]>('unilink-students', []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('unilink-user');
      const storedRole = sessionStorage.getItem('unilink-active-role');
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedRole) setActiveRole(storedRole);
    }
  }, []);

  const assignedGroups = useMemo(() => {
    if (!user) return [];
    
    let relevantGroups: Grupo[] = [];

    if (activeRole === 'Super Docente') {
        relevantGroups = grupos;
    } else {
        const teacherGroupIds = new Set<string>();
        horarios.forEach(horario => {
            horario.blocks.forEach(block => {
                if (block && block.docenteId === user.id) {
                    teacherGroupIds.add(horario.grupoId);
                }
            });
        });
        relevantGroups = grupos.filter(g => teacherGroupIds.has(g.id));
    }

    return relevantGroups.map(group => {
        const subjects = new Set<string>();
        let earliestTime = '24:00';
        
        horarios.forEach(horario => {
            if (horario.grupoId === group.id) {
                horario.blocks.forEach(block => {
                    if (block) {
                        // For Super Docente, show all subjects. For regular teacher, only their own.
                        if (activeRole === 'Super Docente' || block.docenteId === user.id) {
                            const materia = materias.find(m => m.id === block.materiaAsignacionId);
                            if (materia) subjects.add(materia.materia);
                            if (block.horaInicio < earliestTime) earliestTime = block.horaInicio;
                        }
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
    }).filter((g): g is NonNullable<typeof g> => g !== null && g.subjects.length > 0);
  }, [user, activeRole, horarios, grupos, materias, students]);
  
  if (!user) {
    return <p>Cargando...</p>;
  }

  return (
    <div className="grid gap-6">
        <div className="grid gap-2">
            <h1 className="text-3xl font-semibold">¡Bienvenido, {user.name}!</h1>
            <p className="text-muted-foreground">
                {activeRole === 'Super Docente' ? 'Estás en modo Super Docente. Tienes acceso a todos los grupos.' : 'Aquí puedes ver los grupos que tienes asignados.'}
            </p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Mis Grupos</CardTitle>
                <CardDescription>Resumen de los grupos y materias que impartes.</CardDescription>
            </CardHeader>
            <CardContent>
                {assignedGroups.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {assignedGroups.map(group => (
                            <Card key={group.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{group.name}</CardTitle>
                                    <CardDescription>Turno {group.turno}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Materias</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {group.subjects.map(subject => <Badge key={subject} variant="secondary">{subject}</Badge>)}
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
                            {activeRole === 'Super Docente' ? 'No hay grupos creados en el sistema.' : 'Contacta a un administrador para que te asignen materias y horarios.'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
