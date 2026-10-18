import type { ButtonHTMLAttributes } from 'react'
import './PrimaryButton.css'

export default function PrimaryButton({
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={['primary-button', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
