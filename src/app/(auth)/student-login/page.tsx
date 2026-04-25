"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

// --- DATA PERSISTENCE & TYPES ---
// Re-using the same hook definition
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) setStoredValue(JSON.parse(item));
            } catch (error) { console.log(error); }
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (typeof window !== 'undefined') {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) { console.log(error); }
        }
    };
    return [storedValue, setValue];
};

interface Student { id: string; firstName: string; lastName: string; controlNumber: string; }

export default function StudentLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [controlNumberInput, setControlNumberInput] = useState('');
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);

    // Handle student login via control number
    const handleAccess = (e: React.FormEvent) => {
        e.preventDefault();
        const foundStudent = allStudents.find(s => s.controlNumber === controlNumberInput);
        if (foundStudent) {
            sessionStorage.setItem('unilink-student-id', foundStudent.id);
            toast({ title: `¡Bienvenido, ${foundStudent.firstName}!`, description: "Cargando tu información." });
            router.push('/student/dashboard');
        } else {
            toast({ variant: 'destructive', title: 'Número de control no válido', description: 'Por favor, verifica tu número de control e inténtalo de nuevo.' });
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
