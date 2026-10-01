/** A framed, lazily-loaded Google Maps Embed iframe with a consistent shape. */
export function MapEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-muted">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="block aspect-[16/10] w-full border-0"
      />
    </div>
  );
}
