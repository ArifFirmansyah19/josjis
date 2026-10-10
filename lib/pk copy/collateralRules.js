export function findDuplicateCollateral(
  collateral,
  allPk = [],
  currentPkId = null,
) {
  if (!collateral?.number || !allPk?.length) {
    return null;
  }

  const number = String(collateral.number).trim().toLowerCase();

  for (const pk of allPk) {
    if (pk.id === currentPkId) {
      continue;
    }

    for (const item of pk.collaterals || []) {
      if (
        String(item.number || "")
          .trim()
          .toLowerCase() === number
      ) {
        return {
          collateral: item,
          pk,
        };
      }
    }
  }

  return null;
}

export function getCollateralUsage(collateralNumber, allPk = []) {
  if (!collateralNumber) {
    return [];
  }

  const number = String(collateralNumber).trim().toLowerCase();

  const result = [];

  allPk.forEach((pk) => {
    (pk.collaterals || []).forEach((collateral) => {
      if (
        String(collateral.number || "")
          .trim()
          .toLowerCase() === number
      ) {
        result.push({
          pkId: pk.id,
          pkNumber: pk.pkNumber,
          debtorName: pk.debtorName,
          status: pk.loanStatus,
          collateralId: collateral.id,
        });
      }
    });
  });

  return result;
}

export function canReuseCollateral(collateral, allPk = []) {
  const usages = getCollateralUsage(collateral?.number, allPk);

  return usages.every((item) => item.status === "LUNAS");
}
