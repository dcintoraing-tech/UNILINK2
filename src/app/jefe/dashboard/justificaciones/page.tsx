"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const justifications = [
  { id: 1, student: 'Juan Pérez', group: 'Grupo A', date: '2024-05-21', status: 'Pendiente' },
  { id: 2, student: 'Ana López', group: 'Grupo B', date: '2024-05-20', status: 'Aprobado' },
  { id: 3, student: 'Carlos Sánchez', group: 'Grupo A', date: '2024-05-19', status: 'Rechazado' },
];

export default function JustificacionesPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Justificaciones</CardTitle>
                <CardDescription>Visualiza y gestiona las justificaciones de inasistencias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                    <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por Grupo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grupo-a">Grupo A</SelectItem>
                            <SelectItem value="grupo-b">Grupo B</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Filtrar por Alumno..." className="max-w-sm" />
                    <Input type="date" className="w-[180px]" />
                    <Button>Filtrar</Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Alumno</TableHead>
                            <TableHead>Grupo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {justifications.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.student}</TableCell>
                                <TableCell>{item.group}</TableCell>
                                <TableCell>{item.date}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        item.status === 'Aprobado' ? 'default' : item.status === 'Rechazado' ? 'destructive' : 'secondary'
                                    }>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" className="mr-2">Aprobar</Button>
                                    <Button variant="outline" size="sm">Rechazar</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
