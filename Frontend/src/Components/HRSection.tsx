import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type FormSectionProps = Omit<ComponentPropsWithoutRef<'fieldset'>, 'title'> & { title?: ReactNode };
/** A semantic form group; disabled and native fieldset behavior remain available. */
export function FormSection({ title, children, className = '', ...props }: FormSectionProps) {
  return <fieldset {...props} className={`hr-section ${className}`}>{title && <legend>{title}</legend>}{children}</fieldset>;
}

export function SectionCard({ children, className = '', ...props }: ComponentPropsWithoutRef<'section'>) {
  return <section {...props} className={`hr-section ${className}`}>{children}</section>;
}
