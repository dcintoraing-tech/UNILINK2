
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { GraduationCap, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// --- DATA PERSISTENCE & TYPES ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.log(error);
            }
            setIsInitialized(true); 
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (!isInitialized) return;
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.log(error);
        }
    };
    
    return [storedValue, setValue] as const;
};

interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; }
interface User { id: string; name: string; role: string; carreraId?: string; }
interface HorarioBlock { materiaId: string; docenteId: string; duracion: 1 | 2; }
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [dayIndex: number]: DaySchedule };
interface Horario { id: string; grupoId: string; schedule: ScheduleData; }


const AdminDashboard = () => (
    <div>
        <div className="grid gap-2 mb-4">
          <h1 className="text-3xl font-semibold">¡Bienvenido, Administrador!</h1>
          <p className="text-muted-foreground">Este es el centro para todas las tareas administrativas.</p>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Resumen del Sistema</CardTitle>
            <CardDescription>Una vista rápida de tu sistema.</CardDescription>
            </CardHeader>
            <CardContent>
            <p>Aquí verás estadísticas y métricas importantes sobre la gestión de usuarios, estudiantes y catálogos.</p>
            </CardContent>
        </Card>
    </div>
);


const JefeCarreraDashboard = () => {
    const [carreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [users] = useLocalStorage<User[]>('unilink-users', []);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('unilink-user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);
    
    const assignedCarrera = useMemo(() => {
        if (!currentUser || !currentUser.carreraId) return null;
        return carreras.find(c => c.id === currentUser.carreraId);
    }, [currentUser, carreras]);

    const filteredData = useMemo(() => {
        if (!assignedCarrera) return { groups: [], teachers: [] };

        const careerGroups = grupos.filter(g => g.carreraId === assignedCarrera.id);
        const careerGroupIds = new Set(careerGroups.map(g => g.id));

        const careerHorarios = horarios.filter(h => h.grupoId && careerGroupIds.has(h.grupoId));
        
        const teacherIds = new Set<string>();
        careerHorarios.forEach(horario => {
            if (!horario.schedule) return;
            Object.values(horario.schedule).forEach(day => {
                if (!day) return;
                Object.values(day).forEach(block => {
                    if (block && block.docenteId) {
                        teacherIds.add(block.docenteId);
                    }
                });
            });
        });

        const careerTeachers = users.filter(u => u.role === 'Docente' && teacherIds.has(u.id));
        
        return { groups: careerGroups, teachers: careerTeachers };

    }, [assignedCarrera, grupos, horarios, users]);

    if (!assignedCarrera) {
        return (
             <div className="grid gap-2 mb-4">
              <h1 className="text-3xl font-semibold">Dashboard: Jefe de Carrera</h1>
              <p className="text-muted-foreground">Cargando información de tu carrera...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="grid gap-2 mb-4">
              <h1 className="text-3xl font-semibold">Dashboard: {assignedCarrera.name}</h1>
              <p className="text-muted-foreground">Resumen de grupos y docentes de tu área.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GraduationCap /> Grupos de la Carrera</CardTitle>
                        <CardDescription>Total de grupos: {filteredData.groups.length}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredData.groups.length > 0 ? (
                            <ul className="space-y-2">
                                {filteredData.groups.map(group => (
                                    <li key={group.id} className="p-2 border rounded-md text-sm">{group.name}</li>
                                ))}
                            </ul>
                        ): (
                            <p className="text-sm text-muted-foreground">No hay grupos para esta carrera.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase /> Docentes de la Carrera</CardTitle>
                        <CardDescription>Total de docentes: {filteredData.teachers.length}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {filteredData.teachers.length > 0 ? (
                            <ul className="space-y-2">
                                {filteredData.teachers.map(teacher => (
                                    <li key={teacher.id} className="p-2 border rounded-md text-sm">{teacher.name}</li>
                                ))}
                            </ul>
                        ): (
                            <p className="text-sm text-muted-foreground">No hay docentes asignados a esta carrera.</p>
                        )}
                    </CardContent>
                </Card>
             </div>
        </div>
    );
};


export default function AdminDashboardPage() {
    const [activeRole, setActiveRole] = useState('Admin');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const role = sessionStorage.getItem('unilink-active-role') || 'Admin';
        setActiveRole(role);
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return <p>Cargando...</p>;
    }

    return activeRole === 'Jefe de carrera' ? <JefeCarreraDashboard /> : <AdminDashboard />;
}
