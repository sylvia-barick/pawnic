interface PawLogoProps {
  size?: number
  className?: string
}

export function PawLogo({ size = 40, className = '' }: PawLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 10px oklch(0.70 0.22 45)) drop-shadow(0 0 25px oklch(0.70 0.22 45 / 50%))' }}
    >
      {/* Main pad */}
      <ellipse cx="32" cy="40" rx="14" ry="12" fill="oklch(0.70 0.22 45)" />
      {/* Top-left toe */}
      <ellipse cx="14" cy="24" rx="6" ry="7.5" fill="oklch(0.70 0.22 45)" />
      {/* Top-right toe */}
      <ellipse cx="50" cy="24" rx="6" ry="7.5" fill="oklch(0.70 0.22 45)" />
      {/* Mid-left toe */}
      <ellipse cx="22" cy="17" rx="5.5" ry="7" fill="oklch(0.70 0.22 45)" />
      {/* Mid-right toe */}
      <ellipse cx="42" cy="17" rx="5.5" ry="7" fill="oklch(0.70 0.22 45)" />
      {/* Inner pad highlight */}
      <ellipse cx="32" cy="41" rx="8" ry="6.5" fill="oklch(0.60 0.20 45 / 60%)" />
    </svg>
  )
}
