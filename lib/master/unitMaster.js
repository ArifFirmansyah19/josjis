export const UNIT_MASTER = {
  JKK1: {
    code: "11081A",
    name: "Jambi Kuamang Kuning 1",
    mbm: {
      name: "Nama MBM JKK1",
      nip: "NIP MBM JKK1",
      position: "MBM",
    },
  },

  JKK2: {
    code: "11081B",
    name: "Jambi Kuamang Kuning 2",
    mbm: {
      name: "Nama MBM JKK2",
      nip: "NIP MBM JKK2",
      position: "Penyelia Unit",
    },
  },
};

export function getUnitMaster(unit) {
  return UNIT_MASTER[unit] || null;
}
