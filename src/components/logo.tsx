import Image from 'next/image';

export function Logo(props: { className?: string }) {
  return (
    <div className={props.className} style={{ position: 'relative' }}>
      <Image
        src="/logo.png"
        alt="Logo de UniLink Access"
        fill
        style={{ objectFit: 'contain' }}
        sizes="(max-width: 768px) 10vw, 10vw"
        priority
      />
    </div>
  );
}
