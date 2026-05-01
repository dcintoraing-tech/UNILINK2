"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User as UserIcon, PlusCircle, MoreHorizontal, Search, Loader2, Upload, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as faceapi from 'face-api.js';
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';

// --- INTERFACES ---
interface CatalogItem {
    id: string;
    name: string;
}

interface Grupo extends CatalogItem {
    carreraId: string;
}

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

type NewStudentData = Omit<Student, 'id'>;

function StudentRegistrationForm({ 
    onFinished, 
    carreras, 
    grupos, 
    initialData,
    onSave
}: { 
    onFinished: () => void, 
    carreras: CatalogItem[], 
    grupos: Grupo[], 
    initialData: Student | null,
    onSave: (studentData: NewStudentData | Student) => Promise<void> 
}) {
    const { toast } = useToast();

    const [firstName, setFirstName] = useState(initialData?.firstName || '');
    const [lastName, setLastName] = useState(initialData?.lastName || '');
    const [controlNumber, setControlNumber] = useState(initialData?.controlNumber || '');
    const [academicProgram, setAcademicProgram] = useState(initialData?.academicProgramId || '');
    const [assignedGroup, setAssignedGroup] = useState(initialData?.assignedGroupId || '');

    const [capturedImage, setCapturedImage] = useState<string | null>(initialData?.facialImage || null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const studentPlaceholder = PlaceHolderImages.find(p => p.id === 'student-placeholder');

    useEffect(() => {
        const loadModels = async () => {
            if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                // Not blocking, just warning
                return;
            }
            try {
                const MODEL_URL = window.location.origin + '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Error loading models:", error);
                setModelError("No se pudieron cargar los modelos de IA para reconocimiento facial.");
            }
        };
        loadModels();
    }, []);

    const stopCapture = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    };
    
    const startCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setHasCameraPermission(true);
            setIsCapturing(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Acceso a la cámara denegado',
                description: 'Por favor, habilita los permisos de la cámara.',
            });
        }
    };

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
            }
        }
        stopCapture();
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !controlNumber || !academicProgram || !assignedGroup) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa toda la información.' });
            return;
        }

        setIsProcessing(true);

        let embedding: number[] | null = initialData?.embedding || null;
        
        // Only process image if it's new and exists
        if (capturedImage && capturedImage !== initialData?.facialImage) {
            try {
                const img = document.createElement('img');
                img.src = capturedImage;
                await new Promise(resolve => { img.onload = resolve; });

                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                if (detection) {
                    embedding = Array.from(detection.descriptor);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Rostro no detectado',
                        description: 'No se detectó un rostro claro. Se guardará sin huella facial.',
                    });
                    embedding = null;
                }
            } catch (error) {
                console.error("Error generating embedding:", error);
                embedding = null;
            }
        }
        
        try {
            if (initialData) {
                const updatedStudent: Student = {
                    ...initialData,
                    firstName,
                    lastName,
                    controlNumber,
                    academicProgramId: academicProgram,
                    assignedGroupId: assignedGroup,
                    facialImage: capturedImage,
                    embedding: embedding,
                };
                await onSave(updatedStudent);
            } else {
                 const newStudent: NewStudentData = {
                    firstName,
                    lastName,
                    controlNumber,
                    academicProgramId: academicProgram,
                    assignedGroupId: assignedGroup,
                    facialImage: capturedImage,
                    embedding: embedding,
                };
                await onSave(newStudent);
            }
            onFinished();
        } catch (error) {
            console.error("Error saving student:", error);
        } finally {
            setIsProcessing(false);
        }
    };
    
    useEffect(() => {
        return () => stopCapture();
    }, []);

    return (
        <form onSubmit={handleSaveStudent} className="space-y-6">
             <ScrollArea className="max-h-[65vh] pr-4">
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-0 shadow-none">
                        <CardContent className="grid gap-6 p-1">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">Nombre(s)</Label>
                                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">Apellido(s)</Label>
                                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="controlNumber">Número de Control</Label>
                                <Input id="controlNumber" value={controlNumber} onChange={e => setControlNumber(e.target.value)} required />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="academicProgram">Programa Académico</Label>
                                    <Select value={academicProgram} onValueChange={setAcademicProgram} required>
                                        <SelectTrigger id="academicProgram">
                                            <SelectValue placeholder="Selecciona un programa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="assignedGroup">Grupo Asignado</Label>
                                    <Select value={assignedGroup} onValueChange={setAssignedGroup} required>
                                        <SelectTrigger id="assignedGroup">
                                            <SelectValue placeholder="Selecciona un grupo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col border-0 shadow-none">
                        <CardContent className="flex-1 flex flex-col items-center justify-center gap-4 p-1">
                            <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                                <video 
                                    ref={videoRef}
                                    className={cn("w-full h-full object-cover", !isCapturing && "hidden")}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                {!isCapturing && (
                                    <Avatar className="w-full h-full rounded-none">
                                        <AvatarImage src={capturedImage || studentPlaceholder?.imageUrl} alt="Rostro" className="object-cover" />
                                        <AvatarFallback className="text-6xl"><UserIcon /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            
                            <div className="w-full flex flex-col gap-2">
                                {!isCapturing ? (
                                    <Button type="button" variant="outline" onClick={startCapture} className="w-full">
                                        <Camera className="mr-2 h-4 w-4" />
                                        {capturedImage ? 'Cambiar Foto' : 'Tomar Foto (Opcional)'}
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button type="button" variant="ghost" onClick={stopCapture}>Cancelar</Button>
                                        <Button type="button" onClick={takePicture}>Capturar</Button>
                                    </div>
                                )}
                                {capturedImage && (
                                    <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => setCapturedImage(null)}>
                                        Quitar foto
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                <Button type="submit" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isProcessing ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Registrar Estudiante')}
                </Button>
            </DialogFooter>

            <canvas ref={canvasRef} className="hidden"></canvas>
        </form>
    );
}

export default function StudentsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    
    const students = studentsData || [];
    const carreras = carrerasData || [];
    const grupos = gruposData || [];
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);


    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const lowercasedQuery = searchQuery.toLowerCase();
        return students.filter(student => 
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowercasedQuery) ||
            student.controlNumber.toLowerCase().includes(lowercasedQuery)
        );
    }, [students, searchQuery]);

    const getProgramName = (id: string) => carreras.find(c => c.id === id)?.name || 'N/A';
    const getGroupName = (id: string) => grupos.find(g => g.id === id)?.name || 'N/A';
    
    const handleSaveStudent = async (studentData: NewStudentData | Student) => {
        try {
            if ('id' in studentData) {
                const studentDocRef = doc(firestore, 'students', studentData.id);
                await updateDoc(studentDocRef, studentData);
                toast({ title: 'Éxito', description: 'Estudiante actualizado correctamente.' });
            } else {
                await addDoc(collection(firestore, 'students'), studentData);
                toast({ title: 'Éxito', description: 'Estudiante registrado correctamente.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la información.' });
            throw error;
        }
    };
    
    const handleDeleteStudent = async (studentId: string) => {
        try {
            await deleteDoc(doc(firestore, 'students', studentId));
            toast({ title: "Eliminado", description: "Estudiante eliminado del sistema." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar al estudiante.' });
        }
    };

    const handleDownloadTemplate = () => {
        const headers = [['firstName', 'lastName', 'controlNumber', 'academicProgramId', 'assignedGroupId']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Estudiantes");
        
        if (carreras.length > 0 || grupos.length > 0) {
            const infoData = [];
            const maxLength = Math.max(carreras.length, grupos.length);
            for(let i=0; i<maxLength; i++) {
                infoData.push({
                    'ID Carrera': carreras[i]?.id || '',
                    'Nombre Carrera': carreras[i]?.name || '',
                    'ID Grupo': grupos[i]?.id || '',
                    'Nombre Grupo': grupos[i]?.name || ''
                });
            }
            const infoSheet = XLSX.utils.json_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, infoSheet, "IDs de Referencia");
        }

        XLSX.writeFile(wb, "plantilla_estudiantes.xlsx");
    };

    const handleExport = () => {
        const studentsToExport = filteredStudents.map(s => ({
            'Nombre(s)': s.firstName,
            'Apellido(s)': s.lastName,
            'Número de Control': s.controlNumber,
            'Carrera': getProgramName(s.academicProgramId),
            'Grupo': getGroupName(s.assignedGroupId),
            'Con Registro Facial': s.facialImage ? 'Sí' : 'No',
        }));
        const ws = XLSX.utils.json_to_sheet(studentsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estudiantes");
        XLSX.writeFile(wb, "lista_estudiantes.xlsx");
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                const batch = writeBatch(firestore);
                let created = 0;
                let skipped = 0;

                for (const item of json) {
                    if (!item.firstName || !item.lastName || !item.controlNumber || !item.academicProgramId || !item.assignedGroupId) {
                        skipped++;
                        continue;
                    }

                    const newStudent = {
                        firstName: String(item.firstName),
                        lastName: String(item.lastName),
                        controlNumber: String(item.controlNumber),
                        academicProgramId: String(item.academicProgramId),
                        assignedGroupId: String(item.assignedGroupId),
                        facialImage: null,
                        embedding: null,
                    };
                    const newRef = doc(collection(firestore, 'students'));
                    batch.set(newRef, newStudent);
                    created++;
                }

                if (created > 0) await batch.commit();
                toast({ title: "Importación completada", description: `${created} creados, ${skipped} omitidos.` });

            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "El archivo no tiene el formato correcto." });
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Gestión de Estudiantes</CardTitle>
                            <CardDescription>Administra los registros y la información facial de los alumnos.</CardDescription>
                        </div>
                        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                             <div className="relative w-full flex-1 sm:w-auto md:grow-0">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por nombre o control..."
                                    className="w-full rounded-lg bg-background pl-8 md:w-[250px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button size="sm" onClick={() => { setEditingStudent(null); setIsDialogOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nuevo Alumno
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Opciones por Lote</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={handleExport}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar Lista
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={handleDownloadTemplate}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Bajar Plantilla
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
                    
                    {/* Table View */}
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Foto</TableHead>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Control</TableHead>
                                    <TableHead>Grupo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={student.facialImage || undefined} className="object-cover" />
                                                <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {student.firstName} {student.lastName}
                                            {!student.facialImage && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full uppercase">Sin Rostro</span>}
                                        </TableCell>
                                        <TableCell>{student.controlNumber}</TableCell>
                                        <TableCell>{getGroupName(student.assignedGroupId)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => { setEditingStudent(student); setIsDialogOpen(true); }}>Editar / Tomar Foto</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Eliminar a este alumno?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta acción borrará permanentemente sus datos y registros de asistencia.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay alumnos registrados.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
                        <DialogDescription>
                            Puedes capturar la foto ahora o dejarla pendiente para después.
                        </DialogDescription>
                    </DialogHeader>
                    <StudentRegistrationForm 
                        onFinished={() => setIsDialogOpen(false)}
                        carreras={carreras}
                        grupos={grupos}
                        initialData={editingStudent}
                        onSave={handleSaveStudent}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
