import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

const attendanceData = [
  { group: 'Grupo A - Ing. Software', attendance: 95, absences: 5, delays: 2 },
  { group: 'Grupo B - Diseño Gráfico', attendance: 88, absences: 12, delays: 5 },
  { group: 'Grupo C - Contaduría', attendance: 98, absences: 2, delays: 1 },
  { group: 'Grupo D - Psicología', attendance: 91, absences: 9, delays: 3 },
];

export default function AsistenciaPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Asistencia General de Grupos</CardTitle>
                <CardDescription>Visualización global de la asistencia de todos los grupos.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[400px]">Grupo</TableHead>
                            <TableHead>Asistencia</TableHead>
                            <TableHead>Faltas</TableHead>
                            <TableHead className="text-right">Retardos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendanceData.map((item) => (
                            <TableRow key={item.group}>
                                <TableCell className="font-medium">{item.group}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <Progress value={item.attendance} className="w-[60%]" />
                                        <span>{item.attendance}%</span>
                                    </div>
                                </TableCell>
                                <TableCell>{item.absences}</TableCell>
                                <TableCell className="text-right">{item.delays}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
