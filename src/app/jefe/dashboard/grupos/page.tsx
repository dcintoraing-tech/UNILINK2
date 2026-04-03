"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

const chartData = [
  { month: "Enero", desktop: 186, mobile: 80 },
  { month: "Febrero", desktop: 305, mobile: 200 },
  { month: "Marzo", desktop: 237, mobile: 120 },
  { month: "Abril", desktop: 73, mobile: 190 },
  { month: "Mayo", desktop: 209, mobile: 130 },
  { month: "Junio", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Grupo A",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Grupo B",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function GruposPage() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dashboard por Grupos</CardTitle>
                    <CardDescription>Información detallada de los grupos bajo supervisión.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Seleccionar Grupo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grupo-a">Grupo A - Ing. Software</SelectItem>
                            <SelectItem value="grupo-b">Grupo B - Diseño Gráfico</SelectItem>
                            <SelectItem value="grupo-c">Grupo C - Contaduría</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Desempeño del Grupo</CardTitle>
                    <CardDescription>Métricas de desempeño mensuales</CardDescription>
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
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dashed" />}
                            />
                            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                             <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}
