import { ReferenceRow, CURRENT_YEAR } from "../types";

export const calculateStatus = (
  archiveYear: number,
  ref: ReferenceRow
): string => {
  if (!archiveYear) return "Review Manual (No Year)";

  const age = CURRENT_YEAR - archiveYear;
  const activeLimit = ref.activePeriod;
  const inactiveLimit = ref.inactivePeriod;
  const totalLimit = activeLimit + inactiveLimit;

  // Logic defined in user prompt:
  // "Aktif" = if (age) <= activePeriod
  if (age <= activeLimit) {
    return "AKTIF";
  }

  // "Inaktif" = if (age) > activePeriod AND <= (activePeriod + inactivePeriod)
  if (age > activeLimit && age <= totalLimit) {
    return "INAKTIF";
  }

  // "Musnah" / "Permanen" logic
  if (age > totalLimit) {
    if (ref.finalStatus === 'PERMANEN') {
      return "PERMANEN";
    } else {
      return "MUSNAH";
    }
  }

  return "Review Manual";
};