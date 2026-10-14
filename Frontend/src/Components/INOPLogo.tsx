import { INOPConcept, type LogoProps } from './brand/INOPConcepts';

/** Selected IO gateway identity, shared by login, sidebar and mobile navigation. */
export default function INOPLogo(props: Omit<LogoProps, 'concept'>) {
  return <INOPConcept {...props} concept="B" />;
}
