"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- DATA PERSISTENCE & TYPES ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                setStoredValue(item ? JSON.parse(item) : initialValue);
            } catch (error) { 
                console.error(`Error reading localStorage key “${key}”:`, error);
                setStoredValue(initialValue);
            } finally {
                setIsInitialized(true);
            }
        }
    }, [key, initialValue]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (typeof window !== 'undefined') {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) { console.error(`Error setting localStorage key “${key}”:`, error); }
        }
    };
    return [storedValue, setValue, isInitialized];
};

type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string; }
interface AsignacionMateria { id: string; materia: string; }
interface Justificacion { id: string; studentId: string; date: string; reason: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; docenteId: string; materiaId: string; }

function JustificationFormComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const recordId = searchParams.get('recordId');

    const [allAttendance, , attendanceInitialized] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [allSubjects] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    
    const [reason, setReason] = useState('');
    const [record, setRecord] = useState<AttendanceRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!attendanceInitialized) {
            return; // Wait for localStorage to be loaded
        }
        if (!recordId) {
            router.push('/student/dashboard');
            return;
        }

        const foundRecord = allAttendance.find(r => r.id === recordId);
        if (foundRecord && foundRecord.status === 'Falta' && foundRecord.docenteId) {
            setRecord(foundRecord);
        } else {
            toast({ variant: 'destructive', title: 'Registro no válido', description: 'No se puede justificar este registro de falta.' });
            router.push('/student/dashboard');
        }
        setIsLoading(false);
    }, [recordId, allAttendance, router, toast, attendanceInitialized]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!record || !reason || !record.docenteId) {
            toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Por favor, escribe el motivo de la justificación.' });
            return;
        }

        const newJustificacion: Justificacion = {
            id: `just-${record.studentId}-${new Date().toISOString()}`,
            studentId: record.studentId,
            date: record.date,
            reason: reason,
            status: 'Pendiente',
            attendanceRecordId: record.id,
            docenteId: record.docenteId,
            materiaId: record.materiaAsignacionId,
        };

        setJustificaciones(prev => [...prev, newJustificacion]);

        toast({
            title: 'Justificante Enviado',
            description: 'Tu justificante ha sido enviado para revisión por un docente.',
        });
        
        router.push('/student/dashboard');
    };

    if (isLoading) {
        return <p>Cargando información de la falta...</p>;
    }

    if (!record) {
        // This state will be brief as the useEffect will redirect.
        return <p>Verificando registro...</p>;
    }

    const subjectName = allSubjects.find(s => s.id === record.materiaAsignacionId)?.materia || 'Materia Desconocida';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Justificar Falta</CardTitle>
                <CardDescription>
                    Estás justificando tu falta en la materia de <strong>{subjectName}</strong> del día <strong>{format(new Date(record.date), "PPP", { locale: es })}</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Motivo de la Justificación</Label>
                        <Textarea 
                            id="reason" 
                            placeholder="Ej. Cita médica, problema familiar, etc." 
                            required 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full">Enviar Justificante</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/student/dashboard')}>Cancelar</Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function StudentJustificacionesPage() {
    return (
        <div className="grid gap-6">
           <Suspense fallback={<div>Cargando...</div>}>
                <JustificationFormComponent />
            </Suspense>
        </div>
    );
}
