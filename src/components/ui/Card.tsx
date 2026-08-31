import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className = "",
  style,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article";
}) {
  return (
    <As className={`card ${className}`} style={style}>
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  icon,
  action,
  eyebrow,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="headline text-[15px] flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
