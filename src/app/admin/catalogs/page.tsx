import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
  
const catalogData = {
    carreras: [{ name: 'Ingeniería de Software' }, { name: 'Licenciatura en Diseño Gráfico' }],
    grupos: [{ name: 'A-101' }, { name: 'B-202' }],
    cuatrimestres: [{ name: '2024-1' }, { name: '2024-2' }],
    turnos: [{ name: 'Matutino' }, { name: 'Vespertino' }],
};

function CatalogTable({ data, title }: { data: {name: string}[], title: string }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button size="sm">Agregar</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.name}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>Editar</DropdownMenuItem>
                                            <DropdownMenuItem>Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function CatalogsPage() {
    return (
      <div>
        <CardTitle className="mb-4">Catálogos Institucionales</CardTitle>
        <Tabs defaultValue="carreras">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="cuatrimestres">Cuatrimestres</TabsTrigger>
                <TabsTrigger value="turnos">Turnos</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras">
                <CatalogTable data={catalogData.carreras} title="Carreras" />
            </TabsContent>
            <TabsContent value="grupos">
                <CatalogTable data={catalogData.grupos} title="Grupos" />
            </TabsContent>
            <TabsContent value="cuatrimestres">
                <CatalogTable data={catalogData.cuatrimestres} title="Cuatrimestres" />
            </TabsContent>
            <TabsContent value="turnos">
                <CatalogTable data={catalogData.turnos} title="Turnos" />
            </TabsContent>
        </Tabs>
      </div>
    );
}
