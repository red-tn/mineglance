interface CTAButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  href?: string
  className?: string
}

export default function CTAButton({
  variant = 'primary',
  children,
  href = '#',
  className = ''
}: CTAButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-accent text-white hover:bg-green-600 focus:ring-accent shadow-lg hover:shadow-xl',
    secondary: 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white focus:ring-primary'
  }

  return (
    <a
      href={href}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  )
}
