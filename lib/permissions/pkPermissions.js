export const PK_ROLES = {
  ADMIN: "ADMIN",
  SGP: "SGP",
};

export const PK_PERMISSIONS = {
  ADMIN: {
    viewAll: true,

    create: true,
    edit: true,
    editOtherSgp: true,

    lock: true,
    unlock: true,

    editLegalStatus: true,
    editCertificateStatus: true,

    manageOrder: true,
    manageMigration: true,
    manageNotary: true,
    manageBast: true,

    sendCorrection: true,

    viewAudit: true,
  },

  SGP: {
    viewAll: false,

    create: true,
    edit: true,
    editOtherSgp: false,

    lock: false,
    unlock: false,

    editLegalStatus: false,
    editCertificateStatus: false,

    manageOrder: false,
    manageMigration: false,
    manageNotary: false,
    manageBast: false,

    sendCorrection: false,

    viewAudit: false,
  },
};

export function getPkPermissions(role) {
  return PK_PERMISSIONS[role] || PK_PERMISSIONS.SGP;
}

export function canEditPk({ role, pk, currentSgpId }) {
  const permissions = getPkPermissions(role);

  if (!permissions.edit) {
    return false;
  }

  if (role === PK_ROLES.ADMIN) {
    return true;
  }

  if (!pk) {
    return false;
  }

  return pk.mksId === currentSgpId;
}

export function canViewPk({ role, pk, currentSgpId }) {
  const permissions = getPkPermissions(role);

  if (permissions.viewAll) {
    return true;
  }

  if (!pk) {
    return false;
  }

  return pk.mksId === currentSgpId;
}

export function canEditSection({ role, pk, currentSgpId, section }) {
  const permissions = getPkPermissions(role);

  if (role === PK_ROLES.ADMIN) {
    if (section === "legal" && !permissions.editLegalStatus) {
      return false;
    }

    if (section === "certificate" && !permissions.editCertificateStatus) {
      return false;
    }

    return permissions.edit;
  }

  if (section === "legal" || section === "certificate") {
    return false;
  }

  if (!canEditPk({ role, pk, currentSgpId })) {
    return false;
  }

  return true;
}

export function isSectionLocked(pk, section) {
  return Boolean(pk?.locks?.[section]);
}

export function canModifySection({ role, pk, currentSgpId, section }) {
  if (isSectionLocked(pk, section)) {
    return false;
  }

  return canEditSection({
    role,
    pk,
    currentSgpId,
    section,
  });
}
