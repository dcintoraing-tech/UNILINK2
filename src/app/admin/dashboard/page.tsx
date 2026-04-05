"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, UserCheck } from "lucide-react";

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

const attendanceData = [
  { name: 'Grupo A', asistencia: 95, faltas: 5 },
  { name: 'Grupo B', asistencia: 88, faltas: 12 },
  { name: 'Grupo C', asistencia: 92, faltas: 8 },
  { name: 'Grupo D', asistencia: 78, faltas: 22 },
];

const professorData = [
    { name: 'Ana Gómez', groups: 3, attendanceRate: 94 },
    { name: 'Luis Pérez', groups: 2, attendanceRate: 89 },
    { name: 'Carla Solís', groups: 4, attendanceRate: 91 },
]

const JefeCarreraDashboard = () => (
    <div>
        <div className="grid gap-2 mb-4">
          <h1 className="text-3xl font-semibold">Dashboard: Jefe de Carrera</h1>
          <p className="text-muted-foreground">Resumen de desempeño de grupos y profesores.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Grupos Activos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">Grupos bajo tu supervisión</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">91%</div>
                    <p className="text-xs text-muted-foreground">+2% desde el mes pasado</p>
                </CardContent>
            </Card>
        </div>
        <div className="grid gap-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Desempeño de Asistencia por Grupo</CardTitle>
                    <CardDescription>Comparativa de asistencia y faltas en los últimos 30 días.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={attendanceData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="asistencia" stackId="a" fill="hsl(var(--primary))" name="Asistencia (%)" />
                            <Bar dataKey="faltas" stackId="a" fill="hsl(var(--destructive))" name="Faltas (%)" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
);


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
