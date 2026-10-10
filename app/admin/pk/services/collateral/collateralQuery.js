import { isUuid } from "../shared/pkHelpers";

import { mapCollateralToUi } from "./collateralMapping";

export async function fetchCollaterals({ supabase, pkIds }) {
  if (!Array.isArray(pkIds) || !pkIds.length) {
    return new Map();
  }

  const collateralMap = new Map();

  const { data: pkAgunanRows, error: pkAgunanError } = await supabase
    .from("pk_agunan")
    .select("*")
    .in("pk_id", pkIds)
    .order("urutan", {
      ascending: true,
    });

  if (pkAgunanError) {
    throw pkAgunanError;
  }

  if (!pkAgunanRows?.length) {
    return collateralMap;
  }

  const agunanIds = [
    ...new Set(pkAgunanRows.map((row) => row?.agunan_id).filter(Boolean)),
  ];

  let agunanRows = [];

  if (agunanIds.length) {
    const result = await supabase
      .from("agunan")
      .select("*")
      .in("id", agunanIds);

    if (result.error) {
      throw result.error;
    }

    agunanRows = result.data || [];
  }

  const agunanMap = new Map(agunanRows.map((row) => [String(row.id), row]));

  let ownerRows = [];

  if (agunanIds.length) {
    const result = await supabase
      .from("agunan_pemilik")
      .select("*")
      .in("agunan_id", agunanIds)
      .order("is_primary", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (result.error) {
      throw result.error;
    }

    ownerRows = result.data || [];
  }

  const ownerMap = new Map();

  ownerRows.forEach((owner) => {
    if (!owner?.agunan_id) return;

    const key = String(owner.agunan_id);

    if (!ownerMap.has(key)) {
      ownerMap.set(key, []);
    }

    ownerMap.get(key).push(owner);
  });

  const pkAgunanIds = pkAgunanRows.map((row) => row?.id).filter(Boolean);

  let bindingRows = [];

  if (pkAgunanIds.length) {
    const result = await supabase
      .from("agunan_pengikatan")
      .select("*")
      .in("pk_agunan_id", pkAgunanIds)
      .order("created_at", {
        ascending: true,
      });

    // Pertahankan perilaku asli:
    // kegagalan query pengikatan tidak menghentikan fetch.
    if (!result.error) {
      bindingRows = result.data || [];
    }
  }

  const bindingMap = new Map();

  bindingRows.forEach((binding) => {
    if (
      binding?.pk_agunan_id &&
      !bindingMap.has(String(binding.pk_agunan_id))
    ) {
      bindingMap.set(String(binding.pk_agunan_id), binding);
    }
  });

  const notaryIds = [
    ...new Set(
      bindingRows.map((binding) => binding?.notaris_id).filter(isUuid),
    ),
  ];

  let notaryRows = [];

  if (notaryIds.length) {
    const result = await supabase
      .from("notaris")
      .select("id, nama_notaris")
      .in("id", notaryIds);

    // Pertahankan perilaku asli:
    // kegagalan query notaris juga ditoleransi.
    if (!result.error) {
      notaryRows = result.data || [];
    }
  }

  const notaryMap = new Map(notaryRows.map((row) => [String(row.id), row]));

  pkAgunanRows.forEach((pkAgunan) => {
    if (!pkAgunan?.pk_id) return;

    const pkId = String(pkAgunan.pk_id);

    if (!collateralMap.has(pkId)) {
      collateralMap.set(pkId, []);
    }

    const agunan = pkAgunan.agunan_id
      ? agunanMap.get(String(pkAgunan.agunan_id)) || null
      : null;

    const owners = pkAgunan.agunan_id
      ? ownerMap.get(String(pkAgunan.agunan_id)) || []
      : [];

    const binding = pkAgunan.id
      ? bindingMap.get(String(pkAgunan.id)) || null
      : null;

    const notary = binding?.notaris_id
      ? notaryMap.get(String(binding.notaris_id)) || null
      : null;

    collateralMap.get(pkId).push(
      mapCollateralToUi({
        pkAgunan,
        agunan,
        owners,
        binding,
        notary,
      }),
    );
  });

  return collateralMap;
}
