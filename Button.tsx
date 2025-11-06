import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  ...props
}) => {
  return <button {...props} className={tn btn-} />
}
