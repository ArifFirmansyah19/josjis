// lib/pk/pkData.js

export function createEmptyCollateral() {
  return {
    id: `COL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    type: "SHM",
    number: "",

    certificateType: "Fisik",
    certificateLocation: "DIBAWA_DEBITUR",

    area: "",
    bookDate: "",

    // Pemilik dokumen.
    // owner dipertahankan untuk kompatibilitas data lama.
    owner: "",

    // Digunakan jika satu dokumen memiliki lebih dari satu pemilik,
    // misalnya SHM waris.
    owners: [],

    relationship: "",

    value: "",

    address: {
      village: "",
      district: "",
      regency: "",
    },

    note: "",

    binding: {
      type: "TIDAK ADA",

      notaryName: "",
      notaryCode: "",

      fee: "",

      outgoingLetterNumber: "",

      note: "",

      status: "BELUM DIPROSES",
    },
  };
}

export function createEmptyRelatedParty() {
  return {
    id: `REL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    name: "",
    nik: "",
    relationship: "",

    address: {
      street: "",
      rt: "",
      rw: "",
      village: "",
      district: "",
      regency: "",
    },
  };
}

export function createEmptyInsurance() {
  return {
    guarantee: {
      provider: "",
      policyNumber: "",
      applicationDate: "",
    },

    sijitu: {
      advisStatus: "BELUM POSTING",
    },

    lifeInsurance: {
      provider: "",
      policyNumber: "",
      premium: "",
      advisStatus: "BELUM POSTING",
    },

    axa: {
      enabled: false,
      policyNumber: "",
      premium: "",
    },

    magi: {
      advisStatus: "BELUM POSTING",
    },
  };
}

export function createEmptyDocuments() {
  return {
    pasFoto: false,
    spesimen: false,
    ktpDebitur: false,

    gcg: false,
    pdpIndividu: false,

    nak: false,
    rab: false,
    buktiKebun: false,

    fcSertifikat: false,
    suratJualBeli: false,
    pbb: false,

    kk: false,
    akteNikah: false,

    npwp: false,
    bpjsTk: false,

    aplikasiPermohonan: false,

    idebDebitur: false,
    idebPasangan: false,
    idebPihakKetiga: false,

    formDelegasi: false,

    fotoOtsKebun: false,
    fotoOtsRumah: false,
    fotoPk: false,

    cn: false,
    orderSijitu: false,

    ktpPasangan: false,

    dokumenPk: false,

    bastMoral: false,

    suratUsahaMikroKecil: false,
  };
}

export function createEmptyOrder() {
  return {
    required: false,

    status: "BELUM DIPROSES",

    scheduledDate: "",
    orderedAt: "",

    previousLoanDebtorName: "",

    note: "",
  };
}

export function createEmptyBast() {
  return {
    type: "MORAL_OBLIGASI",

    number: "",
    date: "",

    description: "",

    destination: "",

    notaryName: "",

    // Agunan yang masuk ke BAST.
    collateralIds: [],

    // Pihak terkait yang dipilih untuk BAST.
    // Opsional.
    relatedPartyId: "",

    // Untuk kasus tertentu dapat ada beberapa
    // pihak penandatangan.
    signerPartyIds: [],

    status: "DRAFT",

    savedAt: "",

    pdfGenerated: false,

    pdfUrl: "",
  };
}

export function createEmptyPk({ unit = "JKK1", mksId = "SGP-01" } = {}) {
  return {
    id: `PK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    unit,

    // ============================================================
    // MKS / SGP
    // ============================================================

    mksId,

    mksName: "",
    mksAgentCode: "",

    // ============================================================
    // STATUS PK
    // ============================================================

    status: "DRAFT",
    loanStatus: "DRAFT",

    // ============================================================
    // INFORMASI PINJAMAN
    // ============================================================

    loanType: "",

    applicationNumber: "",
    applicationDate: "",

    pkDate: "",
    pkNumber: "",

    limit: "",
    tenor: "",

    cif: "",

    savingsAccount: "",
    loanAccount: "",

    // ============================================================
    // DATA DEBITUR
    // ============================================================

    maritalStatus: "",
    salutation: "",

    debtorName: "",
    nik: "",

    gender: "",

    birthPlace: "",
    birthDate: "",

    // ============================================================
    // ALAMAT DEBITUR
    // ============================================================

    address: {
      street: "",
      rt: "",
      rw: "",
      village: "",
      district: "",
      regency: "",
    },

    // ============================================================
    // PASANGAN
    // ============================================================

    spouse: {
      name: "",
      nik: "",

      address: {
        street: "",
        rt: "",
        rw: "",
        village: "",
        district: "",
        regency: "",
      },

      sameAddress: false,
    },

    // ============================================================
    // PIHAK TERKAIT
    //
    // OPSIONAL.
    //
    // Tidak wajib memiliki pasangan.
    // Dapat digunakan untuk:
    // - Suami
    // - Istri
    // - Ayah
    // - Ibu
    // - Anak
    // - Saudara
    // - Pemilik Agunan
    // - Lainnya
    // ============================================================

    relatedParties: [],

    // ============================================================
    // AGUNAN
    // ============================================================

    collaterals: [],

    // ============================================================
    // ASURANSI & PENJAMINAN
    // ============================================================

    insurance: createEmptyInsurance(),

    // ============================================================
    // DOKUMEN
    // ============================================================

    documents: createEmptyDocuments(),

    // ============================================================
    // ORDER AGUNAN
    // ============================================================

    order: createEmptyOrder(),

    // ============================================================
    // BAST
    // ============================================================

    bast: createEmptyBast(),

    // ============================================================
    // LOCK PER SECTION
    // ============================================================

    locks: {
      loan: false,
      debtor: false,
      address: false,
      spouse: false,
      relatedParties: false,
      collateral: false,
      insurance: false,
      binding: false,
      documents: false,
      order: false,
      bast: false,
    },

    // ============================================================
    // PERMINTAAN PERBAIKAN
    // ============================================================

    correctionRequests: [],

    // ============================================================
    // TIMESTAMP
    // ============================================================

    createdAt: "",
    updatedAt: "",
  };
}

// ================================================================
// DATA DUMMY
// ================================================================

export const initialPkData = [
  {
    ...createEmptyPk({
      unit: "JKK1",
      mksId: "SGP-01",
    }),

    id: "PK-001",

    mksId: "SGP-01",
    mksName: "Budi Santoso",
    mksAgentCode: "MKS-001",

    status: "ACTIVE",
    loanStatus: "ACTIVE",

    loanType: "KUR",

    applicationNumber: "APP-2026-001",
    applicationDate: "2026-05-20",

    pkDate: "2026-06-04",
    pkNumber: "PK/001/JKK/VI/2026",

    limit: 150000000,
    tenor: 36,

    cif: "CIF-100001",

    savingsAccount: "11081-001-123456",
    loanAccount: "11081-001-654321",

    maritalStatus: "ISTRI",
    salutation: "Tuan",

    debtorName: "Muhammad Rofi",
    nik: "1501000101010001",

    gender: "LAKI-LAKI",

    birthPlace: "Muara Bungo",
    birthDate: "1980-01-15",

    address: {
      street: "Jl. Lintas Sumatera",
      rt: "001",
      rw: "002",
      village: "Kuamang Jaya",
      district: "Pelepat Ilir",
      regency: "Bungo",
    },

    spouse: {
      name: "Siti Aminah",
      nik: "1501000202020002",

      address: {
        street: "Jl. Lintas Sumatera",
        rt: "001",
        rw: "002",
        village: "Kuamang Jaya",
        district: "Pelepat Ilir",
        regency: "Bungo",
      },

      sameAddress: true,
    },

    relatedParties: [
      {
        id: "REL-001",

        name: "Siti Aminah",
        nik: "1501000202020002",

        relationship: "ISTRI",

        address: {
          street: "Jl. Lintas Sumatera",
          rt: "001",
          rw: "002",
          village: "Kuamang Jaya",
          district: "Pelepat Ilir",
          regency: "Bungo",
        },
      },
    ],

    collaterals: [
      {
        id: "COL-001",

        type: "SHM",
        number: "1234",

        certificateType: "Fisik",
        certificateLocation: "PERLU_ORDER_CO",

        area: "1200",
        bookDate: "2015-06-10",

        owner: "BUDI SANTOSO",

        owners: [
          {
            name: "BUDI SANTOSO",
            nik: "",
          },
        ],

        relationship: "Jual Beli",

        value: "250000000",

        address: {
          village: "Kuamang Jaya",
          district: "Pelepat Ilir",
          regency: "Bungo",
        },

        note: "Dokumen masih berada pada pinjaman sebelumnya.",

        binding: {
          type: "SKMHT",

          notaryName: "Notaris Ahmad",
          notaryCode: "NOT-001",

          fee: "50000",

          outgoingLetterNumber: "056",

          note: "",

          status: "BELUM DIPROSES",
        },
      },
    ],

    insurance: {
      guarantee: {
        provider: "Askrindo",
        policyNumber: "POL-KUR-001",
        applicationDate: "2026-06-04",
      },

      sijitu: {
        advisStatus: "SUDAH POSTING",
      },

      lifeInsurance: {
        provider: "AFMS",
        policyNumber: "JIWA-001",
        premium: "350000",
        advisStatus: "SUDAH POSTING",
      },

      axa: {
        enabled: false,
        policyNumber: "",
        premium: "",
      },

      magi: {
        advisStatus: "SUDAH POSTING",
      },
    },

    documents: {
      pasFoto: true,
      spesimen: true,
      ktpDebitur: true,

      gcg: true,
      pdpIndividu: true,

      nak: true,
      rab: true,
      buktiKebun: true,

      fcSertifikat: true,
      suratJualBeli: true,
      pbb: true,

      kk: true,
      akteNikah: true,

      npwp: true,
      bpjsTk: true,

      aplikasiPermohonan: true,

      idebDebitur: true,
      idebPasangan: true,
      idebPihakKetiga: false,

      formDelegasi: true,

      fotoOtsKebun: true,
      fotoOtsRumah: true,
      fotoPk: true,

      cn: true,
      orderSijitu: true,

      ktpPasangan: true,

      dokumenPk: true,

      bastMoral: false,

      suratUsahaMikroKecil: true,
    },

    order: {
      required: true,

      status: "PERLU DIORDER",

      scheduledDate: "",

      orderedAt: "",

      previousLoanDebtorName: "Muhammad Rofi",

      note: "Agunan perlu di-order dari pinjaman sebelumnya.",
    },

    bast: {
      type: "MORAL_OBLIGASI",

      number: "",
      date: "",

      description: "",

      destination: "DEBITUR",

      notaryName: "",

      collateralIds: [],

      relatedPartyId: "REL-001",

      signerPartyIds: ["REL-001"],

      status: "DRAFT",

      savedAt: "",

      pdfGenerated: false,

      pdfUrl: "",
    },

    locks: {
      loan: false,
      debtor: false,
      address: false,
      spouse: false,
      relatedParties: false,
      collateral: false,
      insurance: false,
      binding: false,
      documents: false,
      order: false,
      bast: false,
    },

    correctionRequests: [],

    createdAt: "2026-06-04T08:00:00",
    updatedAt: "2026-06-04T08:00:00",
  },

  {
    ...createEmptyPk({
      unit: "JKK2",
      mksId: "SGP-05",
    }),

    id: "PK-002",

    mksId: "SGP-05",
    mksName: "Dedi Irawan",
    mksAgentCode: "MKS-005",

    status: "ACTIVE",
    loanStatus: "ACTIVE",

    loanType: "KUM",

    applicationNumber: "APP-2026-002",
    applicationDate: "2026-06-10",

    pkDate: "2026-06-12",
    pkNumber: "PK/002/JKK/VI/2026",

    limit: 75000000,
    tenor: 24,

    cif: "CIF-100002",

    savingsAccount: "11081-002-123456",
    loanAccount: "11081-002-654321",

    maritalStatus: "SUAMI",
    salutation: "Nyonya",

    debtorName: "Yeni Lestari",
    nik: "1501000303030003",

    gender: "PEREMPUAN",

    birthPlace: "Jambi",
    birthDate: "1985-03-20",

    address: {
      street: "Jl. Kuamang Kuning",
      rt: "003",
      rw: "001",
      village: "Sungai Lilin",
      district: "Pelepat",
      regency: "Bungo",
    },

    spouse: {
      name: "",
      nik: "",

      address: {
        street: "",
        rt: "",
        rw: "",
        village: "",
        district: "",
        regency: "",
      },

      sameAddress: false,
    },

    // Tidak wajib.
    relatedParties: [],

    collaterals: [
      {
        id: "COL-002",

        type: "SHM",
        number: "5678",

        certificateType: "Fisik",
        certificateLocation: "DI_CABANG",

        area: "800",
        bookDate: "2018-02-15",

        owner: "YENI LESTARI",

        owners: [
          {
            name: "YENI LESTARI",
            nik: "1501000303030003",
          },
        ],

        relationship: "Milik Sendiri",

        value: "150000000",

        address: {
          village: "Sungai Lilin",
          district: "Pelepat",
          regency: "Bungo",
        },

        note: "",

        binding: {
          type: "TIDAK ADA",

          notaryName: "",
          notaryCode: "",

          fee: "",

          outgoingLetterNumber: "",

          note: "",

          status: "BELUM DIPROSES",
        },
      },
    ],

    insurance: {
      guarantee: {
        provider: "",
        policyNumber: "",
        applicationDate: "",
      },

      sijitu: {
        advisStatus: "BELUM POSTING",
      },

      lifeInsurance: {
        provider: "",
        policyNumber: "",
        premium: "",
        advisStatus: "BELUM POSTING",
      },

      axa: {
        enabled: false,
        policyNumber: "",
        premium: "",
      },

      magi: {
        advisStatus: "BELUM POSTING",
      },
    },

    documents: createEmptyDocuments(),

    order: {
      required: false,

      status: "TIDAK DIPERLUKAN",

      scheduledDate: "",

      orderedAt: "",

      previousLoanDebtorName: "",

      note: "",
    },

    bast: createEmptyBast(),

    locks: {
      loan: false,
      debtor: false,
      address: false,
      spouse: false,
      relatedParties: false,
      collateral: false,
      insurance: false,
      binding: false,
      documents: false,
      order: false,
      bast: false,
    },

    correctionRequests: [],

    createdAt: "2026-06-12T08:00:00",
    updatedAt: "2026-06-12T08:00:00",
  },
];
