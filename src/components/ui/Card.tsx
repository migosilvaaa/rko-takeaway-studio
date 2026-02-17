import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hover = false, className = '', ...props }, ref) => {
    const hoverStyles = hover ? 'hover:shadow-lg hover:-translate-y-1' : ''

    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-md p-6 transition-all duration-200 ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
