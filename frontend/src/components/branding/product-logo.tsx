import Image from 'next/image';
import Link from 'next/link';

interface ProductLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: {
    mark: 28,
    fullWidth: 108,
    fullHeight: 32,
  },
  md: {
    mark: 34,
    fullWidth: 132,
    fullHeight: 40,
  },
  lg: {
    mark: 46,
    fullWidth: 168,
    fullHeight: 50,
  },
};

export function ProductLogo({
  size = 'md',
  showText = true,
  className = '',
  href,
  onClick,
}: ProductLogoProps) {
  const sizing = sizeMap[size];
  const content = showText ? (
    <span className="relative inline-flex items-center" style={{ height: sizing.fullHeight }}>
      <Image
        src="/logos/download.svg"
        alt="GitSense"
        width={sizing.fullWidth}
        height={sizing.fullHeight}
        priority
        className="dark:hidden"
      />
      <Image
        src="/logos/noBgWhite.png"
        alt=""
        aria-hidden="true"
        width={sizing.fullWidth}
        height={sizing.fullHeight}
        className="hidden dark:block"
      />
    </span>
  ) : (
    <span className="relative inline-flex items-center overflow-hidden" style={{ width: sizing.mark, height: sizing.mark }}>
      <Image
        src="/logos/symbol.svg"
        alt="GitSense"
        width={sizing.mark}
        height={sizing.mark}
        style={{ width: '100%', height: '100%' }}
        className="object-contain"
      />
    </span>
  );

  const classes = `inline-flex max-w-full items-center ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`${classes} transition-smooth hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background`}
        aria-label="Go to GitSense home"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} aria-label="GitSense">
      {content}
    </div>
  );
}
