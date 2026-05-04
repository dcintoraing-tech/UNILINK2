import Image from 'next/image';

export function Logo(props: { className?: string }) {
  return (
    <div className={props.className} style={{ position: 'relative' }}>
      {/* 
        Para cambiar tu logo, reemplaza el archivo /public/logo.png.
        Si usas un formato diferente (ej. .svg, .jpg), actualiza el `src` aquí.
        El atributo `sizes` ayuda a Next.js a elegir la mejor calidad de imagen,
        evitando que se vea borrosa. `priority` asegura que se cargue rápidamente.
      */}
      <Image
        src="/logo.png"
        alt="Logo de SIBF - CAI"
        fill
        style={{ objectFit: 'contain' }}
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
      />
    </div>
  );
}
