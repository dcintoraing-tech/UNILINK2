"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    controlNumber: string;
    academicProgramId: string;
    assignedGroupId: string;
    facialImage: string | null;
    embedding: number[] | null;
}

export default function StudentLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();
    const [controlNumberInput, setControlNumberInput] = useState('');

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
            return;
        }

        const studentsCollection = collection(firestore, 'students');
        const q = query(studentsCollection, where("controlNumber", "==", controlNumberInput));

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Número de control no válido', description: 'Por favor, verifica tu número de control e inténtalo de nuevo.' });
                return;
            }

            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data() as Student;

            sessionStorage.setItem('unilink-student-id', studentDoc.id);
            if (studentData) {
                sessionStorage.setItem('unilink-user', JSON.stringify({id: studentDoc.id, name: `${studentData.firstName} ${studentData.lastName}`, role: 'Alumno' }));
            }

            toast({ title: `¡Bienvenido, ${studentData.firstName}!`, description: "Cargando tu información." });
            router.push('/student/dashboard');

        } catch (error) {
            console.error("Student login error: ", error);
            toast({ variant: 'destructive', title: 'Error de acceso', description: 'Ocurrió un problema al verificar tu número de control.' });
        }
    };

    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight text-center">Acceso de Alumno</CardTitle>
                <CardDescription className="text-center">Ingresa tu número de control para ver tu dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAccess} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="control-number">Número de Control</Label>
                        <Input
                            id="control-number"
                            value={controlNumberInput}
                            onChange={(e) => setControlNumberInput(e.target.value)}
                            placeholder="Ej. 12345678"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        Acceder
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </form>
                 <p className="mt-6 text-center text-sm text-muted-foreground">
                    ¿Eres docente o administrador?{" "}
                    <Link href="/login" passHref>
                        <Button variant="link" className="p-0 h-auto">
                        Inicia sesión aquí
                        </Button>
                    </Link>
                 </p>
            </CardContent>
        </Card>
    );
}
