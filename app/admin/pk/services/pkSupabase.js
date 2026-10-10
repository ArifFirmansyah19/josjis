export { fetchPkData, updatePkData } from "./loan/loanService";

export { syncRelatedParties } from "./debtor/debtorService";

export { syncInsurance } from "./insurance/insuranceService";

export {
  syncCollaterals,
  syncAgunanOwners,
  fetchMasterAgunanForReuse,
  syncAgunanBinding,
} from "./collateral/collateralService";

export {
  mapCollateralToUi,
  mapCertificateTypeToUi,
  mapCertificateLocationToUi,
} from "./collateral/collateralMapping";

export {
  normalizeCollateralForSave,
  validateCollateral,
  mapLocationToDb,
  mapCertificateTypeToDb,
  buildBindingNote,
} from "./collateral/collateralValidation";

export {
  textOrEmpty,
  nullableText,
  nullableNumber,
  nullableDate,
  isUuid,
  generateFallbackOwnerId,
} from "./shared/pkHelpers";

export async function fetchNotaries({ supabase }) {
  const result = await supabase
    .from("notaris")
    .select(
      "id, nama_notaris, provinsi, kabupaten, nomor_rekening, jenis_rekanan",
    )
    .order("nama_notaris", { ascending: true });

  if (result.error) throw result.error;

  return result.data || [];
}
