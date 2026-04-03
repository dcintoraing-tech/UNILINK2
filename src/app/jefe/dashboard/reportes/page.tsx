"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const reportData = [
  { name: 'Reporte de Asistencia Mensual', date: '2024-05-01', type: 'Asistencia' },
  { name: 'Evaluación de Desempeño Q2', date: '2024-04-01', type: 'Desempeño' },
  { name: 'Reporte Anual de Justificaciones', date: '2024-01-01', type: 'Justificaciones' },
]

export default function ReportesPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Generación de Reportes</CardTitle>
                <CardDescription>Genera, visualiza y exporta reportes generales del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                     <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de Reporte" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asistencia">Asistencia</SelectItem>
                            <SelectItem value="desempeno">Desempeño</SelectItem>
                            <SelectItem value="justificaciones">Justificaciones</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="date" className="w-[180px]" />
                    <span className="text-sm">a</span>
                     <Input type="date" className="w-[180px]" />
                    <Button>Generar Reporte</Button>
                </div>

                <Card>
                    <CardHeader className='flex-row items-center justify-between'>
                         <CardTitle>Reportes Generados</CardTitle>
                         <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar a Excel</Button>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Reporte</TableHead>
                                    <TableHead>Fecha de Generación</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((report) => (
                                    <TableRow key={report.name}>
                                        <TableCell>{report.name}</TableCell>
                                        <TableCell>{report.date}</TableCell>
                                        <TableCell>{report.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">Ver</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    )
}
