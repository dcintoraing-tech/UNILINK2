import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const backups = [
    { id: 1, date: '2024-05-20 10:00:00', file: 'backup-20240520.sql.gz' },
    { id: 2, date: '2024-05-19 10:00:00', file: 'backup-20240519.sql.gz' },
]

export default function BackupPage() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Respaldo del Sistema</CardTitle>
                    <CardDescription>Gestiona los respaldos de la base de datos.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch id="auto-backup" />
                            <Label htmlFor="auto-backup">Programación automática (diaria)</Label>
                        </div>
                        <Button>Generar Respaldo Ahora</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Respaldos Anteriores</CardTitle>
                    <CardDescription>Restaura a partir de un punto anterior.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Archivo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {backups.map(backup => (
                                <TableRow key={backup.id}>
                                    <TableCell>{backup.date}</TableCell>
                                    <TableCell>{backup.file}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline">Restaurar</Button>
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
