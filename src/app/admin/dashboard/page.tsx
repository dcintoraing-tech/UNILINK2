
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { GraduationCap, Briefcase, Users, XCircle } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

// --- DATA PERSISTENCE & TYPES ---
interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; }
interface User { id: string; name: string; role: string; carreraId?: string; }
interface Student { id: string; assignedGroupId: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; status: AttendanceStatus; }

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
    const firestore = useFirestore();

    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: usersData } = useCollection<User>(useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore]));
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    
    const carreras = carrerasData || [];
    const grupos = gruposData || [];
    const users = usersData || [];
    const students = studentsData || [];
    const attendance = attendanceData || [];

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
        if (!assignedCarrera) return { groups: [], teachers: [], students: [], absences: 0 };

        const careerGroups = grupos.filter(g => g.carreraId === assignedCarrera.id);
        const careerGroupIds = new Set(careerGroups.map(g => g.id));
        
        const careerTeachers = users.filter(u => u.role === 'Docente' && u.carreraId === assignedCarrera.id);

        const careerStudents = students.filter(s => careerGroupIds.has(s.assignedGroupId));
        const careerStudentIds = new Set(careerStudents.map(s => s.id));

        const careerAbsences = attendance.filter(a => a.status === 'Falta' && careerStudentIds.has(a.studentId)).length;
        
        return { groups: careerGroups, teachers: careerTeachers, students: careerStudents, absences: careerAbsences };

    }, [assignedCarrera, grupos, users, students, attendance]);

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
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Estudiantes</CardTitle>
                        <CardDescription>Total de estudiantes en la carrera: {filteredData.students.length}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredData.students.length > 0 ? (
                            <p className="text-sm text-muted-foreground">La lista de estudiantes se puede gestionar en la sección de "Estudiantes".</p>
                        ): (
                            <p className="text-sm text-muted-foreground">No hay estudiantes en esta carrera.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><XCircle className="text-destructive"/> Faltas Acumuladas</CardTitle>
                        <CardDescription>Total de faltas registradas en la carrera.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{filteredData.absences}</div>
                        <p className="text-sm text-muted-foreground">Las faltas se pueden consultar en "Reportes".</p>
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

    