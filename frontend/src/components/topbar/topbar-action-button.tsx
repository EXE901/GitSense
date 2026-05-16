'use client';

type TopbarActionButtonProps = {
  label: string;
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
  badge?: number;
  onClick: () => void;
};

export function TopbarActionButton({
  label,
  title,
  icon,
  isActive = false,
  badge,
  onClick,
}: TopbarActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      aria-expanded={isActive}
      className={`relative flex-shrink-0 rounded-lg border p-2 transition-smooth hover-scale-up focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        isActive
          ? 'border-primary/35 bg-primary/10 text-primary shadow-[0_0_24px_rgba(59,130,246,0.16)]'
          : 'border-transparent text-muted-foreground hover:border-border/50 hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      {icon}
      {badge ? (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-background bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground shadow-[0_0_16px_rgba(59,130,246,0.45)]">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}
