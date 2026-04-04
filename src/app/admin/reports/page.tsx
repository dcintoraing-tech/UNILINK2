"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

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
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reportes Institucionales</CardTitle>
                    <CardDescription>Filtra y visualiza datos de la institución.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Carrera" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="isw">Ingeniería de Software</SelectItem>
                            <SelectItem value="ldg">Diseño Gráfico</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="a101">A-101</SelectItem>
                            <SelectItem value="b202">B-202</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Docente" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ana">Ana Gómez</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="matutino">Matutino</SelectItem>
                            <SelectItem value="vespertino">Vespertino</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
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
