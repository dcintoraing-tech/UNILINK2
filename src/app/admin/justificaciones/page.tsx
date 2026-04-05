import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const justificaciones = [
    { id: 1, student: 'Ana Torres', date: '2024-05-21', reason: 'Cita médica', status: 'Aprobado' },
    { id: 2, student: 'Luis Pérez', date: '2024-05-20', reason: 'Asunto familiar', status: 'Pendiente' },
    { id: 3, student: 'Carla Solís', date: '2024-05-19', reason: 'Enfermedad', status: 'Rechazado' },
]

export default function JustificacionesPage() {
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Aprobado': return 'default';
            case 'Pendiente': return 'secondary';
            case 'Rechazado': return 'destructive';
            default: return 'outline';
        }
    };
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Justificaciones</CardTitle>
                    <CardDescription>Revisa y aprueba las justificaciones de inasistencia de los estudiantes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {justificaciones.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.student}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline">Aprobar</Button>
                                        <Button size="sm" variant="destructive">Rechazar</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
