
"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { sub, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) setStoredValue(JSON.parse(item));
            } catch (error) { console.log(error); }
            setIsInitialized(true);
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (!isInitialized || typeof window === 'undefined') return;
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) { console.log(error); }
    };
    return [storedValue, setValue];
};

const chartData = [
    { month: 'Enero', groupA: 86, groupB: 78 },
    { month: 'Febrero', groupA: 92, groupB: 88 },
    { month: 'Marzo', groupA: 95, groupB: 90 },
    { month: 'Abril', groupA: 88, groupB: 85 },
    { month: 'Mayo', groupA: 91, groupB: 89 },
    { month: 'Junio', groupA: 93, groupB: 91 },
  ];

const chartConfig = {
    groupA: {
        label: "Grupo A",
        color: "hsl(var(--chart-1))",
    },
    groupB: {
        label: "Grupo B",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig;

export default function ReportsPage() {
    const [carreras, setCarreras] = useLocalStorage('unilink-carreras', []);
    const [grupos, setGrupos] = useLocalStorage('unilink-grupos', []);
    const [users, setUsers] = useLocalStorage('unilink-users', []);
    const [modalidades, setModalidades] = useLocalStorage('unilink-modalidades', []);
    const [sedes, setSedes] = useLocalStorage('unilink-sedes', []);
    const [students, setStudents] = useLocalStorage('unilink-students', []);
    const [materias, setMaterias] = useLocalStorage('unilink-materia-asignaciones', []);
    const [horarios, setHorarios] = useLocalStorage('unilink-horarios', []);
    const [attendance, setAttendance] = useLocalStorage('unilink-attendance', []);
    
    const [dataGenerated, setDataGenerated] = useLocalStorage('unilink-large-mock-data-generated', false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleGenerateData = () => {
        setIsGenerating(true);

        setTimeout(() => {
            try {
                // 1. Define base data
                const mockSedes = [{id: 'central', name: 'Sede Central'}, {id: 'norte', name: 'Campus Norte'}, {id: 'sur', name: 'Campus Sur'}];
                const mockModalidades = [{id: 'presencial', name: 'Presencial'}, {id: 'online', name: 'En Línea'}];
                const mockCarreras = [
                    { id: 'isw', name: 'Ingeniería de Software' },
                    { id: 'ldg', name: 'Diseño Gráfico' },
                    { id: 'lci', name: 'Comercio Internacional' },
                    { id: 'lth', name: 'Turismo y Hotelería' },
                ];
                const cuatrimestres = ['2', '5', '8'];
                const turnos = ["Matutino", "Vespertino"];

                const newUsers: any[] = [];
                const newStudents: any[] = [];
                const newGrupos: any[] = [];
                const newMaterias: any[] = [];
                const newHorarios: any[] = [];
                const newAttendance: any[] = [];

                let userCounter = users.length;
                mockCarreras.forEach(carrera => {
                    for (let i = 0; i < 5; i++) { // 5 docentes per carrera
                        userCounter++;
                        newUsers.push({
                            id: `docente-${carrera.id}-${i}-${userCounter}`,
                            name: `Docente ${carrera.id.toUpperCase()} ${i + 1}`,
                            email: `docente.${carrera.id}.${i+1}@unilink.com`,
                            password: 'password',
                            role: 'Docente',
                            carreraId: carrera.id,
                            status: 'Activo',
                            createdAt: new Date().toISOString()
                        });
                    }
                });

                let studentCounter = students.length;
                mockCarreras.forEach(carrera => {
                    for (let i = 0; i < 10; i++) { // 10 grupos per carrera
                        const cuatrimestre = cuatrimestres[i % cuatrimestres.length];
                        const grupoId = `${carrera.id}-${cuatrimestre}-${i}`;
                        newGrupos.push({
                            id: grupoId,
                            name: `Grupo ${carrera.id.toUpperCase()} ${cuatrimestre}0${i}`,
                            carreraId: carrera.id,
                            cuatrimestre: cuatrimestre,
                            semestre: 'NONE',
                            turno: turnos[i % turnos.length],
                            modalidadId: mockModalidades[i % mockModalidades.length].id,
                            sedeId: mockSedes[i % mockSedes.length].id,
                        });

                        for (let j = 0; j < 10; j++) {
                            studentCounter++;
                            const studentId = `student-${studentCounter}`;
                            newStudents.push({
                                id: studentId,
                                firstName: `Alumno ${studentCounter}`,
                                lastName: `Apellido`,
                                controlNumber: `2024${String(studentCounter).padStart(4, '0')}`,
                                academicProgramId: carrera.id,
                                assignedGroupId: grupoId,
                                facialImage: null,
                                embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
                            });
                        }

                        const grupoMaterias = [];
                        for (let k = 0; k < 5; k++) {
                            const materiaId = `mat-${carrera.id}-${cuatrimestre}-${k}`;
                            if (!newMaterias.find(m => m.id === materiaId)) {
                                newMaterias.push({
                                    id: materiaId,
                                    materia: `Materia ${k + 1} de ${carrera.name} (${cuatrimestre}Q)`,
                                    carreraId: carrera.id,
                                    cuatrimestre: cuatrimestre,
                                    semestre: 'NONE'
                                });
                            }
                            grupoMaterias.push(newMaterias.find(m => m.id === materiaId));
                        }

                        const docentesCarrera = newUsers.filter(u => u.carreraId === carrera.id);
                        const schedule: any = {};
                        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                            schedule[dayIndex] = {
                                0: {
                                    materiaId: grupoMaterias[dayIndex % grupoMaterias.length].id,
                                    docenteId: docentesCarrera[dayIndex % docentesCarrera.length].id,
                                    duracion: 1,
                                }
                            };
                        }
                        newHorarios.push({ id: grupoId, grupoId: grupoId, schedule: schedule });
                    }
                });

                const today = new Date();
                const fourMonthsAgo = sub(today, { months: 4 });
                const dateInterval = eachDayOfInterval({ start: fourMonthsAgo, end: today });

                newStudents.forEach(student => {
                    const studentHorario = newHorarios.find(h => h.grupoId === student.assignedGroupId);
                    if (!studentHorario) return;

                    let absencesToAssign = Math.floor(Math.random() * 6) + 5;
                    let latesToAssign = Math.floor(Math.random() * 4) + 2;

                    dateInterval.forEach(date => {
                        const dayIndex = date.getDay() - 1;
                        if (dayIndex < 0 || dayIndex > 4) return;

                        const daySchedule = studentHorario.schedule[dayIndex];
                        if (daySchedule && daySchedule[0]) {
                            const materiaId = daySchedule[0].materiaId;
                            const dateString = format(startOfDay(date), 'yyyy-MM-dd');
                            const recordId = `att-${student.id}-${dateString}-${materiaId}`;
                            let status: 'Presente' | 'Retardo' | 'Falta' = 'Presente';

                            if (absencesToAssign > 0 && Math.random() < 0.1) {
                                status = 'Falta';
                                absencesToAssign--;
                            } else if (latesToAssign > 0 && Math.random() < 0.05) {
                                status = 'Retardo';
                                latesToAssign--;
                            }
                            
                            newAttendance.push({
                                id: recordId,
                                studentId: student.id,
                                date: dateString,
                                materiaAsignacionId: materiaId,
                                status: status,
                                arrivalTime: '07:05:00'
                            });
                        }
                    });
                });

                setSedes(mockSedes);
                setModalidades(mockModalidades);
                setCarreras(mockCarreras);
                setUsers(prev => [...prev.filter(u => !newUsers.some(nu => nu.email === u.email)), ...newUsers]);
                setGrupos(prev => [...prev, ...newGrupos]);
                setStudents(prev => [...prev, ...newStudents]);
                setMaterias(prev => [...prev, ...newMaterias]);
                setHorarios(prev => [...prev, ...newHorarios]);
                setAttendance(prev => [...prev, ...newAttendance]);

                setDataGenerated(true);
                toast({
                    title: "Datos de prueba generados",
                    description: "El sistema ha sido poblado con cientos de registros simulados."
                });
            } catch (e) {
                console.error("Data generation failed:", e);
                toast({
                    variant: "destructive",
                    title: "Error al generar datos",
                    description: "No se pudieron crear los datos de prueba. Revisa la consola."
                });
            } finally {
                setIsGenerating(false);
                setTimeout(() => window.location.reload(), 1000);
            }
        }, 100);
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reportes Institucionales</CardTitle>
                    <CardDescription>Filtra y visualiza datos de la institución.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Sede" /></SelectTrigger>
                        <SelectContent>
                            {sedes.map(sede => <SelectItem key={sede.id} value={sede.id}>{sede.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select>
                        <SelectTrigger><SelectValue placeholder="Modalidad" /></SelectTrigger>
                        <SelectContent>
                            {modalidades.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Carrera" /></SelectTrigger>
                        <SelectContent>
                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Docente" /></SelectTrigger>
                        <SelectContent>
                           {users.filter(u => u.role === 'Docente').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                        <SelectContent>
                             {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleGenerateData} disabled={dataGenerated || isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isGenerating ? "Generando datos..." : (dataGenerated ? "Datos de prueba ya generados" : "Generar Datos de Prueba")}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>Comparativa de Grupos</CardTitle>
                        <CardDescription>Promedio de calificaciones mensuales</CardDescription>
                    </div>
                    <Button size="sm" className="w-full sm:w-auto">Exportar a Excel</Button>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart accessibilityLayer data={chartData}>
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="groupA" fill="var(--color-groupA)" radius={4} />
                            <Bar dataKey="groupB" fill="var(--color-groupB)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}
