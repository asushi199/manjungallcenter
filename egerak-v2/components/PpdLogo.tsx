import Image from "next/image";

export const PPD_LOGO_SRC = "/logo/sentra-logo.png";

type Props = {
  className?: string;
  /** Lebar paparan (px); tinggi auto kekalkan nisbah */
  width?: number;
  priority?: boolean;
};

export default function PpdLogo({ className = "", width = 72, priority = false }: Props) {
  return (
    <Image
      src={PPD_LOGO_SRC}
      alt="Logo SentRa PPD Manjung"
      width={1254}
      height={1254}
      className={`h-auto object-contain ${className}`}
      style={{ width: `${width}px`, maxWidth: "100%", height: "auto" }}
      sizes={`(max-width: 768px) ${width}px, ${width}px`}
      priority={priority}
    />
  );
}
