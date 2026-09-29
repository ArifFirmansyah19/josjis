"use client";

import { canModifySection } from "@/lib/permissions/pkPermissions";

export default function PkPermissionGate({
  role,
  pk,
  currentSgpId,
  section,
  children,
  fallback = null,
}) {
  const allowed = canModifySection({
    role,
    pk,
    currentSgpId,
    section,
  });

  if (!allowed) {
    return fallback;
  }

  return children;
}
