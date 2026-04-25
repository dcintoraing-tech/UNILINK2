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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';


type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
interface AttendanceRecord { id: string; studentId: string; date: string; materiaAsignacionId: string; status: AttendanceStatus; docenteId?: string; }
interface AsignacionMateria { id: string; materia: string; }
interface Justificacion { id: string; studentId: string; date: string; reason: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; docenteId: string; materiaId: string; }

function JustificationFormComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const recordId = searchParams.get('recordId');
    const firestore = useFirestore();

    const { data: allAttendance, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    const { data: allSubjects, isLoading: subjectsLoading } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    
    const [reason, setReason] = useState('');
    const [record, setRecord] = useState<AttendanceRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (attendanceLoading) {
            return; // Wait for data to be loaded
        }
        if (!recordId) {
            router.push('/student/dashboard');
            return;
        }

        const foundRecord = (allAttendance || []).find(r => r.id === recordId);
        if (foundRecord && foundRecord.status === 'Falta' && foundRecord.docenteId) {
            setRecord(foundRecord);
        } else {
            toast({ variant: 'destructive', title: 'Registro no válido', description: 'No se puede justificar este registro de falta.' });
            router.push('/student/dashboard');
        }
        setIsLoading(false);
    }, [recordId, allAttendance, router, toast, attendanceLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!record || !reason || !record.docenteId) {
            toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Por favor, escribe el motivo de la justificación.' });
            return;
        }

        const newJustificacion: Omit<Justificacion, 'id'> = {
            studentId: record.studentId,
            date: record.date,
            reason: reason,
            status: 'Pendiente',
            attendanceRecordId: record.id,
            docenteId: record.docenteId,
            materiaId: record.materiaAsignacionId,
        };

        try {
            await addDoc(collection(firestore, 'justificaciones'), newJustificacion);

            toast({
                title: 'Justificante Enviado',
                description: 'Tu justificante ha sido enviado para revisión.',
            });
            
            router.push('/student/dashboard');

        } catch (error) {
            console.error("Error creating justification:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el justificante.' });
        }
    };

    if (isLoading || attendanceLoading || subjectsLoading) {
        return <p>Cargando información de la falta...</p>;
    }

    if (!record) {
        return <p>Verificando registro...</p>;
    }

    const subjectName = (allSubjects || []).find(s => s.id === record.materiaAsignacionId)?.materia || 'Materia Desconocida';

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
