"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';


const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.error(`Error reading localStorage key “${key}”:`, error);
            } finally {
                setIsInitialized(true);
            }
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (!isInitialized) return;
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };

    if (!isInitialized) {
        return [initialValue, () => {}];
    }

    return [storedValue, setValue];
};

interface AttendanceConfig {
    toleranceMinutes: number;
    absenceLimitMinutes: number;
}

const backups = [
    { id: 1, date: '2024-05-20 10:00:00', file: 'backup-20240520.sql.gz' },
    { id: 2, date: '2024-05-19 10:00:00', file: 'backup-20240519.sql.gz' },
]

export default function SettingsPage() {
    const [config, setConfig] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    const { toast } = useToast();

    const [tolerance, setTolerance] = useState(config.toleranceMinutes);
    const [absenceLimit, setAbsenceLimit] = useState(config.absenceLimitMinutes);

    useEffect(() => {
        setTolerance(config.toleranceMinutes);
        setAbsenceLimit(config.absenceLimitMinutes);
    }, [config]);

    const handleSave = () => {
        const newConfig = {
            toleranceMinutes: Number(tolerance),
            absenceLimitMinutes: Number(absenceLimit),
        };
        setConfig(newConfig);
        toast({
            title: 'Configuración Guardada',
            description: 'Las reglas de asistencia han sido actualizadas.',
        });
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
