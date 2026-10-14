import { INOPConcept, type LogoProps } from './brand/INOPConcepts';

/** Original four-letter wordmark shared by all application brand surfaces. */
export default function INOPLogo(props: Omit<LogoProps, 'concept'>) {
  return <INOPConcept {...props} concept="A" />;
}
