

"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { sub, format, eachDayOfInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TrendingDown, Users, PieChart as PieChartIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


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

interface User { id: string; name: string; role: 'Docente' | 'Admin' | 'Jefe de carrera'; carreraId?: string; }
interface CatalogItem { id: string; name: string; }
interface Grupo extends CatalogItem { carreraId: string; cuatrimestre: string; modalidadId?: string }
interface Student { id: string; assignedGroupId: string; }
type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; status: AttendanceStatus; docenteId?: string;}

const chartConfig = {
    faltas: { label: "Faltas", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

export default function ReportsPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    
    const [filters, setFilters] = useState({
        carreraId: 'all',
        grupoId: 'all',
        docenteId: 'all',
        cuatrimestre: 'all',
        modalidadId: 'all',
    });

    const [carreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos, setGrupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [users, setUsers] = useLocalStorage<User[]>('unilink-users', []);
    const [modalidades, setModalidades] = useLocalStorage<CatalogItem[]>('unilink-modalidades', []);
    const [students, setStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [mockDataGenerated, setMockDataGenerated] = useLocalStorage<boolean>('unilink-mock-admin-data-generated', false);
    const { toast } = useToast();

    useEffect(() => {
        // Set initial date range on client to avoid hydration mismatch
        setDateRange({ from: sub(new Date(), { days: 30 }), to: new Date() });
    }, []);

    const handleGenerateMockData = () => {
        if (mockDataGenerated) {
            toast({ title: 'Datos ya generados', description: 'Los datos de prueba ya han sido generados previamente.' });
            return;
        }

        const newSedes: CatalogItem[] = [
            { id: 'sede-central', name: 'Campus Central' },
            { id: 'sede-norte', name: 'Campus Norte' },
            { id: 'sede-sur', name: 'Campus Sur' },
        ];
        const newModalidades: CatalogItem[] = [
            { id: 'mod-presencial', name: 'Presencial' },
            { id: 'mod-online', name: 'En Línea' },
        ];
        
        const newUsers: User[] = [];
        carreras.forEach(carrera => {
            for (let i = 1; i <= 2; i++) {
                const docenteName = `Docente ${carrera.name.substring(0,3)}${i}`;
                newUsers.push({
                    id: `docente-${carrera.id}-${i}`,
                    name: docenteName,
                    role: 'Docente',
                    carreraId: carrera.id,
                } as User);
            }
        });

        const newGrupos: Grupo[] = [];
        const newStudents: Student[] = [];
        const newAttendance: AttendanceRecord[] = [];
        const periodos = ['2', '5', '8'];

        carreras.forEach(carrera => {
            if (carrera.name === 'Odontología') return;

            periodos.forEach(periodo => {
                for (let i = 1; i <= 10; i++) {
                    const grupoName = `${carrera.name.substring(0,3).toUpperCase()}${periodo}0${i}`;
                    const grupoId = `grupo-${carrera.id}-${periodo}-${i}`;
                    newGrupos.push({
                        id: grupoId,
                        name: grupoName,
                        carreraId: carrera.id,
                        cuatrimestre: periodo,
                        modalidadId: i % 2 === 0 ? 'mod-online' : 'mod-presencial'
                    });

                    for (let j = 1; j <= 10; j++) {
                        const studentId = `student-${grupoId}-${j}`;
                        newStudents.push({
                            id: studentId,
                            assignedGroupId: grupoId,
                        } as Student);
                        
                        const startDate = sub(new Date(), { months: 4 });
                        const endDate = new Date();
                        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
                        
                        let faltasCount = Math.floor(Math.random() * 5) + 3; // 3 a 7 faltas

                        for (const date of dateInterval) {
                           if (Math.random() > 0.7) { // 30% chance of having a record for any given day
                                const status = faltasCount > 0 && Math.random() > 0.8 ? 'Falta' : 'Presente';
                                if (status === 'Falta') faltasCount--;
                                
                                newAttendance.push({
                                    id: `att-${studentId}-${format(date, 'yyyy-MM-dd')}`,
                                    studentId: studentId,
                                    date: format(date, 'yyyy-MM-dd'),
                                    status: status,
                                    docenteId: `docente-${carrera.id}-${(i%2)+1}`
                                });
                           }
                        }
                    }
                }
            });
        });
        
        // This is not ideal as useLocalStorage hook is component-scoped
        // A better approach would be a global state management or context API
        // For now, we'll just set it to local storage directly.
        localStorage.setItem('unilink-sedes', JSON.stringify(newSedes));
        localStorage.setItem('unilink-modalidades', JSON.stringify(newModalidades));
        localStorage.setItem('unilink-users', JSON.stringify([...users, ...newUsers]));
        localStorage.setItem('unilink-grupos', JSON.stringify([...grupos, ...newGrupos]));
        localStorage.setItem('unilink-students', JSON.stringify([...students, ...newStudents]));
        localStorage.setItem('unilink-attendance', JSON.stringify([...attendance, ...newAttendance]));
        
        setMockDataGenerated(true);
        toast({ title: 'Datos de prueba generados', description: 'El sistema ha sido poblado con datos realistas. Refresca la página para ver los cambios.' });
    };

    useEffect(() => {
        const storedUser = sessionStorage.getItem('unilink-user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            if (user.role === 'Jefe de carrera' && user.carreraId) {
                setFilters(prev => ({ ...prev, carreraId: user.carreraId }));
            }
        }
    }, []);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'carreraId') {
                newFilters.grupoId = 'all';
                newFilters.docenteId = 'all';
                newFilters.cuatrimestre = 'all';
            }
            return newFilters;
        });
    };

    const { filteredGrupos, filteredDocentes, filteredCuatrimestres } = useMemo(() => {
        if (filters.carreraId === 'all') {
            return {
                filteredGrupos: grupos,
                filteredDocentes: users.filter(u => u.role === 'Docente'),
                filteredCuatrimestres: [...new Set(grupos.map(g => g.cuatrimestre))].filter(q => q !== 'NONE'),
            };
        }
        const fGrupos = grupos.filter(g => g.carreraId === filters.carreraId);
        const fDocentes = users.filter(u => u.role === 'Docente' && u.carreraId === filters.carreraId);
        const fCuatrimestres = [...new Set(fGrupos.map(g => g.cuatrimestre))].filter(q => q !== 'NONE');

        return { filteredGrupos: fGrupos, filteredDocentes: fDocentes, filteredCuatrimestres: fCuatrimestres };

    }, [filters.carreraId, grupos, users]);

    const reportData = useMemo(() => {
        const startDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const endDate = dateRange?.to ? endOfDay(dateRange.to) : null;

        const dateFilteredAttendance = attendance.filter(record => {
            if (!startDate || !endDate) return true;
            const recordDate = parseISO(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });

        const relevantStudentIds = new Set(
            students
            .filter(student => {
                const group = grupos.find(g => g.id === student.assignedGroupId);
                if (!group) return false;
                
                const isCarreraMatch = filters.carreraId === 'all' || group.carreraId === filters.carreraId;
                const isGrupoMatch = filters.grupoId === 'all' || group.id === filters.grupoId;
                const isCuatrimestreMatch = filters.cuatrimestre === 'all' || group.cuatrimestre === filters.cuatrimestre;
                const isModalidadMatch = filters.modalidadId === 'all' || group.modalidadId === filters.modalidadId;

                return isCarreraMatch && isGrupoMatch && isCuatrimestreMatch && isModalidadMatch;
            })
            .map(s => s.id)
        );

        const finalAttendance = dateFilteredAttendance.filter(record =>
            relevantStudentIds.has(record.studentId) &&
            (filters.docenteId === 'all' || record.docenteId === filters.docenteId)
        );

        const totalFaltas = finalAttendance.filter(r => r.status === 'Falta').length;
        const totalRegistros = finalAttendance.length;
        const porcentajeInasistencia = totalRegistros > 0 ? (totalFaltas / totalRegistros) * 100 : 0;
        const uniqueStudentsCount = new Set(finalAttendance.map(r => r.studentId)).size;
        const promedioFaltas = uniqueStudentsCount > 0 ? totalFaltas / uniqueStudentsCount : 0;

        const faltasPorGrupo = finalAttendance
            .filter(r => r.status === 'Falta')
            .reduce((acc, record) => {
                const student = students.find(s => s.id === record.studentId);
                if (student) {
                    const group = grupos.find(g => g.id === student.assignedGroupId);
                    if (group) {
                        acc[group.name] = (acc[group.name] || 0) + 1;
                    }
                }
                return acc;
            }, {} as Record<string, number>);

        const barChartData = Object.entries(faltasPorGrupo).map(([name, faltas]) => ({ name, faltas })).sort((a,b) => b.faltas - a.faltas);

        const faltasPorDia = finalAttendance
            .filter(r => r.status === 'Falta')
            .reduce((acc, record) => {
                const day = format(parseISO(record.date), 'yyyy-MM-dd');
                acc[day] = (acc[day] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const lineChartData = Object.entries(faltasPorDia)
            .map(([date, faltas]) => ({ date, faltas }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        return {
            kpis: { totalFaltas, porcentajeInasistencia, promedioFaltas },
            barChartData,
            lineChartData,
        };

    }, [dateRange, filters, attendance, students, grupos, users]);

    const isJefe = currentUser?.role === 'Jefe de carrera';

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Dashboard de Reportes</CardTitle>
                        <CardDescription>Filtra y visualiza los datos de asistencia de la institución.</CardDescription>
                    </div>
                     <Button onClick={handleGenerateMockData} disabled={mockDataGenerated}>Generar Datos de Prueba</Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                        <Label>Rango de Fechas</Label>
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Carrera</Label>
                        <Select onValueChange={(v) => handleFilterChange('carreraId', v)} value={filters.carreraId} disabled={isJefe}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Carreras</SelectItem>
                                {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label>Grupo</Label>
                        <Select onValueChange={(v) => handleFilterChange('grupoId', v)} value={filters.grupoId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Grupos</SelectItem>
                                {filteredGrupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Docente</Label>
                        <Select onValueChange={(v) => handleFilterChange('docenteId', v)} value={filters.docenteId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Docentes</SelectItem>
                                {filteredDocentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Cuatrimestre</Label>
                        <Select onValueChange={(v) => handleFilterChange('cuatrimestre', v)} value={filters.cuatrimestre}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Cuatrimestres</SelectItem>
                                {filteredCuatrimestres.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Modalidad</Label>
                        <Select onValueChange={(v) => handleFilterChange('modalidadId', v)} value={filters.modalidadId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Modalidades</SelectItem>
                                {modalidades.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Faltas</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.kpis.totalFaltas}</div>
                        <p className="text-xs text-muted-foreground">en el periodo seleccionado</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">% Inasistencia General</CardTitle>
                        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.kpis.porcentajeInasistencia.toFixed(2)}%</div>
                         <p className="text-xs text-muted-foreground">de todas las clases registradas</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Promedio Faltas / Alumno</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.kpis.promedioFaltas.toFixed(2)}</div>
                         <p className="text-xs text-muted-foreground">promedio por alumno en el periodo</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Comparativa de Faltas por Grupo</CardTitle>
                        <CardDescription>Total de faltas por grupo en el periodo seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <BarChart accessibilityLayer data={reportData.barChartData} layout="vertical" margin={{ right: 20 }}>
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} />
                                <XAxis dataKey="faltas" type="number" hide />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                <Bar dataKey="faltas" fill="var(--color-faltas)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia de Faltas</CardTitle>
                        <CardDescription>Evolución de las faltas diarias en el periodo seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <LineChart accessibilityLayer data={reportData.lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis hide />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="faltas" stroke="var(--color-faltas)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
