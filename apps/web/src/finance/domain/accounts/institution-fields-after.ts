interface InstitutionDomainFields {
  institutionDomain: string | null;
  guessedInstitutionDomain: string | null;
}

/** The domain whose icon the account shows: the Member's own, else the guess. */
export function institutionDomainOf(account: InstitutionDomainFields) {
  return account.institutionDomain ?? account.guessedInstitutionDomain;
}

/** The fields a change of `institution` also changes: a new name drops the old guess until the server guesses again. */
export function institutionFieldsAfter(
  existing: { institution: string },
  change: { institution?: string },
): { guessedInstitutionDomain?: null } {
  return change.institution === undefined ||
    change.institution === existing.institution
    ? {}
    : { guessedInstitutionDomain: null };
}
