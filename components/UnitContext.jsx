"use client";

import { createContext, useContext, useState } from "react";

const UnitContext = createContext(null);

export const units = [
  {
    value: "JKK1",
    code: "11081A",
    name: "Jambi Kuamang Kuning 1",
  },
  {
    value: "JKK2",
    code: "11081B",
    name: "Jambi Kuamang Kuning 2",
  },
];

export function UnitProvider({ children }) {
  const [selectedUnit, setSelectedUnit] = useState("JKK1");

  const activeUnit =
    units.find((unit) => unit.value === selectedUnit) || units[0];

  return (
    <UnitContext.Provider
      value={{
        selectedUnit,
        setSelectedUnit,
        activeUnit,
        units,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);

  if (!context) {
    throw new Error("useUnit harus digunakan di dalam UnitProvider");
  }

  return context;
}
