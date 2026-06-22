import Image from "next/image";

export const SENTRA_LOGO_SRC = "/logo/sentra-mark.png";

type Props = {
  className?: string;
  /** Saiz paparan (px) — logo berbentuk segi empat sama */
  size?: number;
  priority?: boolean;
};

export default function SentraLogo({ className = "", size = 48, priority = false }: Props) {
  return (
    <Image
      src={SENTRA_LOGO_SRC}
      alt="Logo SentRa PPD Manjung"
      width={512}
      height={512}
      className={`object-contain ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, maxWidth: "100%" }}
      priority={priority}
    />
  );
}
