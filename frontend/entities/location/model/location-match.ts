const omittedSuffixes = ['시', '도', '구', '군', '읍', '면', '동', '리'];
const separatorPattern = /[\s\p{P}\p{S}]+/gu;

export function normalizeComparable(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(separatorPattern, '');
}

export function buildComparableVariants(
  value: string,
  includeOmittedSuffixVariants = true
): Set<string> {
  const comparable = normalizeComparable(value);
  const variants = new Set<string>();

  if (!comparable) {
    return variants;
  }

  variants.add(comparable);

  if (includeOmittedSuffixVariants) {
    for (const suffix of omittedSuffixes) {
      if (comparable.endsWith(suffix) && comparable.length > suffix.length) {
        variants.add(comparable.slice(0, -suffix.length));
      }
    }
  }

  return variants;
}

export function buildLocationComparablePath(parts: Array<string | undefined>) {
  return normalizeComparable(parts.filter(Boolean).join('-'));
}
