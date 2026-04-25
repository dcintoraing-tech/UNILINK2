

"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { sub, format, eachDayOfInterval, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TrendingDown, Users, PieChart as PieChartIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


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
    
    const [dateFilterMode, setDateFilterMode] = useState<"range" | "month" | "cuatrimestre">("range");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedCuatrimestre, setSelectedCuatrimestre] = useState(1);
    
    const [filters, setFilters] = useState({
        carreraId: 'all',
        grupoId: 'all',
        docenteId: 'all',
        cuatrimestre: 'all',
        modalidadId: 'all',
    });

    const firestore = useFirestore();
    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: usersData } = useCollection<User>(useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore]));
    const { data: modalidadesData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'modalidades'), [firestore]));
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));

    const carreras = carrerasData || [];
    const grupos = gruposData || [];
    const users = usersData || [];
    const modalidades = modalidadesData || [];
    const students = studentsData || [];
    const attendance = attendanceData || [];
    const { toast } = useToast();

    const years = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i), []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const monthName = format(new Date(2000, i, 1), 'LLLL', { locale: es });
        return { value: i, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
    }), []);
    const cuatrimestresOptions = useMemo(() => [
        { value: 1, label: "Enero - Abril" },
        { value: 2, label: "Mayo - Agosto" },
        { value: 3, label: "Septiembre - Diciembre" }
    ], []);

    useEffect(() => {
        if (dateFilterMode === 'month') {
            const from = startOfMonth(new Date(selectedYear, selectedMonth));
            const to = endOfMonth(new Date(selectedYear, selectedMonth));
            setDateRange({ from, to });
        } else if (dateFilterMode === 'cuatrimestre') {
            const startMonth = (selectedCuatrimestre - 1) * 4;
            const endMonth = startMonth + 3;
            const from = startOfMonth(new Date(selectedYear, startMonth));
            const to = endOfMonth(new Date(selectedYear, endMonth));
            setDateRange({ from, to });
        }
    }, [dateFilterMode, selectedYear, selectedMonth, selectedCuatrimestre]);

    useEffect(() => {
        // Set initial date range on client to avoid hydration mismatch
        setDateRange({ from: sub(new Date(), { days: 30 }), to: new Date() });

        const storedUser = sessionStorage.getItem('unilink-user');
        const activeRole = sessionStorage.getItem('unilink-active-role');
        
        if (storedUser) {
            const user = JSON.parse(storedUser);
            const effectiveRole = activeRole || user.role;
            const effectiveUser = { ...user, role: effectiveRole };
            
            setCurrentUser(effectiveUser);
            
            if (effectiveUser.role === 'Jefe de carrera' && effectiveUser.carreraId) {
                setFilters(prev => ({ ...prev, carreraId: effectiveUser.carreraId }));
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
        if (filters.carreraId === 'all' && currentUser?.role !== 'Jefe de carrera') {
            return {
                filteredGrupos: grupos,
                filteredDocentes: users.filter(u => u.role === 'Docente'),
                filteredCuatrimestres: [...new Set(grupos.map(g => g.cuatrimestre))].filter(q => q && q !== 'NONE'),
            };
        }
        const fGrupos = grupos.filter(g => g.carreraId === filters.carreraId);
        const fDocentes = users.filter(u => u.role === 'Docente' && u.carreraId === filters.carreraId);
        const fCuatrimestres = [...new Set(fGrupos.map(g => g.cuatrimestre))].filter(q => q && q !== 'NONE');

        return { filteredGrupos: fGrupos, filteredDocentes: fDocentes, filteredCuatrimestres: fCuatrimestres };

    }, [filters.carreraId, grupos, users, currentUser]);

    const reportData = useMemo(() => {
        const startDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const endDate = dateRange?.to ? endOfDay(dateRange.to) : null;

        const dateFilteredAttendance = attendance.filter(record => {
            if (!startDate || !endDate) return true;
            try {
                const recordDate = parseISO(record.date);
                return recordDate >= startDate && recordDate <= endDate;
            } catch(e) {
                return false;
            }
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
                try {
                    const day = format(parseISO(record.date), 'yyyy-MM-dd');
                    acc[day] = (acc[day] || 0) + 1;
                } catch(e) {}
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
                <CardHeader>
                    <div>
                        <CardTitle>Dashboard de Reportes</CardTitle>
                        <CardDescription>Filtra y visualiza los datos de asistencia de la institución.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                        <Label>Tipo de Filtro de Fecha</Label>
                        <Select value={dateFilterMode} onValueChange={(v) => setDateFilterMode(v as any)}>
                            <SelectTrigger><SelectValue placeholder="Selecciona un filtro" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="range">Rango de Fechas</SelectItem>
                                <SelectItem value="month">Por Mes</SelectItem>
                                <SelectItem value="cuatrimestre">Por Cuatrimestre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {dateFilterMode === 'range' && (
                        <div className="grid gap-2">
                            <Label>Rango de Fechas</Label>
                            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                        </div>
                    )}

                    {dateFilterMode === 'month' && (
                        <>
                            <div className="grid gap-2">
                                <Label>Año</Label>
                                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Mes</Label>
                                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {dateFilterMode === 'cuatrimestre' && (
                        <>
                            <div className="grid gap-2">
                                <Label>Año</Label>
                                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Cuatrimestre</Label>
                                <Select value={String(selectedCuatrimestre)} onValueChange={(v) => setSelectedCuatrimestre(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {cuatrimestresOptions.map(q => <SelectItem key={q.value} value={String(q.value)}>{q.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {!isJefe && (
                        <div className="grid gap-2">
                            <Label>Carrera</Label>
                            <Select onValueChange={(v) => handleFilterChange('carreraId', v)} value={filters.carreraId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Carreras</SelectItem>
                                    {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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
                                    tickFormatter={(val) => {
                                        try { return format(parseISO(val), 'MMM d')} catch(e) {return ''}
                                    }}
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
