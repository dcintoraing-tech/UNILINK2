"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StudentJustificacionesPage() {
    const { toast } = useToast();
    const [date, setDate] = useState<Date>();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // UI Only, no submission logic
        toast({
            title: 'Justificante Enviado (Simulación)',
            description: 'Tu justificante ha sido enviado para revisión. Este es un mensaje de demostración.',
        });
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Enviar Justificante</CardTitle>
                    <CardDescription>Completa el formulario para justificar una falta o retardo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Fecha de la Falta</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Selecciona una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Motivo de la Justificación</Label>
                            <Textarea id="reason" placeholder="Ej. Cita médica, problema familiar, etc." required />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="file">Adjuntar Documento</Label>
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, PDF (MAX. 5MB)</p>
                                    </div>
                                    <Input id="dropzone-file" type="file" className="hidden" />
                                </label>
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Enviar Justificante</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
