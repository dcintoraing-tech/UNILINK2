"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

const mockAttendance = [
  { id: 1, subject: 'Cálculo Diferencial', date: '2024-05-20', status: 'Presente' },
  { id: 2, subject: 'Programación Orientada a Objetos', date: '2024-05-20', status: 'Retardo' },
  { id: 3, subject: 'Bases de Datos', date: '2024-05-21', status: 'Falta' },
  { id: 4, subject: 'Cálculo Diferencial', date: '2024-05-22', status: 'Presente' },
  { id: 5, subject: 'Redes de Computadoras', date: '2024-05-23', status: 'Falta Justificada' },
  { id: 6, subject: 'Bases de Datos', date: '2024-05-24', status: 'Falta' },
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'Presente':
      return { variant: 'default', icon: <CheckCircle className="h-4 w-4" />, text: 'Presente' };
    case 'Retardo':
      return { variant: 'secondary', icon: <Clock className="h-4 w-4" />, text: 'Retardo' };
    case 'Falta':
      return { variant: 'destructive', icon: <XCircle className="h-4 w-4" />, text: 'Falta' };
    case 'Falta Justificada':
      return { variant: 'outline', icon: <FileText className="h-4 w-4" />, text: 'Falta Justificada' };
    default:
      return { variant: 'outline', icon: null, text: 'N/A' };
  }
};

export default function StudentDashboardPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold">Mis Asistencias</h1>
        <p className="text-muted-foreground">Aquí puedes ver un resumen de tus asistencias, retardos y faltas.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asistencia</CardTitle>
          <CardDescription>Resumen de tus registros por clase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockAttendance.map(record => {
            const { variant, icon, text } = getStatusInfo(record.status);
            return (
              <div key={record.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{record.subject}</p>
                  <p className="text-sm text-muted-foreground">{new Date(record.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <Badge variant={variant} className="flex items-center gap-2">
                  {icon}
                  <span>{text}</span>
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
