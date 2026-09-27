"use client";

import { UnitProvider } from "@/components/UnitContext";

export default function Providers({ children }) {
  return <UnitProvider>{children}</UnitProvider>;
}
