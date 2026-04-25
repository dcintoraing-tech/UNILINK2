"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';


interface AttendanceConfig {
    toleranceMinutes: number;
    absenceLimitMinutes: number;
}

const backups = [
    { id: 1, date: '2024-05-20 10:00:00', file: 'backup-20240520.sql.gz' },
    { id: 2, date: '2024-05-19 10:00:00', file: 'backup-20240519.sql.gz' },
]

export default function SettingsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const configRef = useMemoFirebase(() => doc(firestore, 'config', 'attendance'), [firestore]);
    const { data: configData } = useDoc<AttendanceConfig>(configRef);

    const [tolerance, setTolerance] = useState(10);
    const [absenceLimit, setAbsenceLimit] = useState(30);

    useEffect(() => {
        if (configData) {
            setTolerance(configData.toleranceMinutes);
            setAbsenceLimit(configData.absenceLimitMinutes);
        }
    }, [configData]);

    const handleSave = async () => {
        const newConfig = {
            toleranceMinutes: Number(tolerance),
            absenceLimitMinutes: Number(absenceLimit),
        };
        try {
            await setDoc(configRef, newConfig, { merge: true });
            toast({
                title: 'Configuración Guardada',
                description: 'Las reglas de asistencia han sido actualizadas.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Asistencia</CardTitle>
                    <CardDescription>
                        Define las reglas para el registro de asistencias, retardos y ausencias.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid max-w-sm items-center gap-2">
                        <Label htmlFor="tolerance">Minutos de Tolerancia para Retardo</Label>
                        <Input
                            id="tolerance"
                            type="number"
                            value={tolerance}
                            onChange={(e) => setTolerance(Number(e.target.value))}
                            placeholder="Ej. 10"
                        />
                        <p className="text-sm text-muted-foreground">
                            Después de este tiempo desde el inicio de la clase, se marcará como retardo.
                        </p>
                    </div>
                    <div className="grid max-w-sm items-center gap-2">
                        <Label htmlFor="absenceLimit">Tiempo Límite para Registrar Asistencia (Minutos)</Label>
                        <Input
                            id="absenceLimit"
                            type="number"
                            value={absenceLimit}
                            onChange={(e) => setAbsenceLimit(Number(e.target.value))}
                            placeholder="Ej. 30"
                        />
                        <p className="text-sm text-muted-foreground">
                           Después de este tiempo, el estudiante ya no podrá registrar su asistencia a la clase.
                        </p>
                    </div>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </Card>

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
    );
}
