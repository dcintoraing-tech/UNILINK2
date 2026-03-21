import { PlusCircle, File, MoreHorizontal } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const users = [
    {
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        role: 'Alumno',
        status: 'Activo',
        createdAt: '2023-10-26'
    },
    {
        name: 'Ana Gómez',
        email: 'ana.gomez@example.com',
        role: 'Docente',
        status: 'Activo',
        createdAt: '2023-10-25'
    },
    {
        name: 'Luis Fernandez',
        email: 'luis.fernandez@example.com',
        role: 'Admin',
        status: 'Inactivo',
        createdAt: '2023-10-24'
    }
]

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                Crea, edita y elimina usuarios.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                    <File className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Exportar
                    </span>
                </Button>
                <Button size="sm">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Crear Usuario
                    </span>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado el</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
                <TableRow key={user.email}>
                    <TableCell className="font-medium">
                        <div>{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                        <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
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
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> usuarios
        </div>
      </CardFooter>
    </Card>
  );
}
