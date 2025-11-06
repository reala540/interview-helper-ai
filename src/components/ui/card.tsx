import * as React from "react"

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={card } {...props} />

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={card-content } {...props} />

export const toast = (options: any) => {
  console.log('Toast:', options)
}
