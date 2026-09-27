"use client";

import { Check, Search, X } from "lucide-react";

export function FormField({ label, name, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
      />
    </div>
  );
}

export function Modal({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function TopUpModal({
  open,
  onClose,
  searchTerm,
  setSearchTerm,
  filteredTopUps,
  selectedTopUps,
  toggleTopUp,
  tambahTopUp,
  formatDokumenLengkap,
  StatusBadge,
}) {
  if (!open) return null;

  return (
    <Modal title="Tambah Pinjaman / Top Up" onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari nama debitur atau norek. pinjaman..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
            autoFocus
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200">
          {filteredTopUps.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Data tidak ditemukan.
            </div>
          ) : (
            filteredTopUps.map((item) => {
              const checked = selectedTopUps.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-4 border-b border-slate-100 px-4 py-4 transition last:border-b-0 ${
                    checked ? "bg-slate-50" : "hover:bg-slate-50/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTopUp(item.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {item.namaDebitur}
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {item.norekPinjaman}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDokumenLengkap(item.agunan?.[0])}
                    </p>
                  </div>

                  <StatusBadge status="Top Up" />
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400">
            {selectedTopUps.length} data dipilih
          </p>

          <button
            type="button"
            onClick={tambahTopUp}
            disabled={selectedTopUps.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Tambahkan
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ManualModal({
  open,
  onClose,
  manualForm,
  handleManualChange,
  resetManualForm,
  simpanManual,
}) {
  if (!open) return null;

  return (
    <Modal
      title="Input Manual"
      onClose={() => {
        resetManualForm();
        onClose();
      }}
      width="max-w-3xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nama Debitur"
          name="namaDebitur"
          value={manualForm.namaDebitur}
          onChange={handleManualChange}
          placeholder="Contoh: JISMI"
        />

        <FormField
          label="Norek. Pinjaman"
          name="norekPinjaman"
          value={manualForm.norekPinjaman}
          onChange={handleManualChange}
          placeholder="Contoh: 1234567890"
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Jenis Dokumen
          </label>

          <select
            name="jenis"
            value={manualForm.jenis}
            onChange={handleManualChange}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="SHM">SHM</option>
            <option value="BPKB">BPKB</option>
            <option value="SK">SK</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <FormField
          label="Nomor Dokumen"
          name="nomor"
          value={manualForm.nomor}
          onChange={handleManualChange}
          placeholder="Contoh: 1147"
        />

        <FormField
          label="Desa Agunan"
          name="desa"
          value={manualForm.desa}
          onChange={handleManualChange}
          placeholder="Contoh: Mendalo"
        />

        <FormField
          label="Nama di Sertifikat"
          name="namaSertifikat"
          value={manualForm.namaSertifikat}
          onChange={handleManualChange}
          placeholder="Contoh: JISMI"
        />

        <FormField
          label="Keterangan Pemilik"
          name="keteranganPemilik"
          value={manualForm.keteranganPemilik}
          onChange={handleManualChange}
          placeholder="Contoh: milik sendiri"
        />

        <FormField
          label="Luas Sertifikat"
          name="luas"
          value={manualForm.luas}
          onChange={handleManualChange}
          placeholder="Contoh: 120"
        />

        <FormField
          label="Keterangan Posisi Agunan"
          name="keterangan"
          value={manualForm.keterangan}
          onChange={handleManualChange}
          placeholder="Contoh: Bundel, MAP No. 1"
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            resetManualForm();
            onClose();
          }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={simpanManual}
          className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Simpan
        </button>
      </div>
    </Modal>
  );
}

export function EditNotasiModal({
  open,
  order,
  editNoNotasi,
  setEditNoNotasi,
  onClose,
  simpanEdit,
}) {
  if (!open || !order) return null;

  return (
    <Modal title="Edit No. Notasi" onClose={onClose} width="max-w-md">
      <div>
        <p className="mb-4 text-sm text-slate-500">{order.namaDebitur}</p>

        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          No. Notasi
        </label>

        <input
          type="text"
          value={editNoNotasi}
          onChange={(event) => setEditNoNotasi(event.target.value)}
          placeholder="Masukkan No. Notasi"
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          autoFocus
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={simpanEdit}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteOrderModal({ open, order, onClose, hapusOrder }) {
  if (!open || !order) return null;

  return (
    <Modal title="Hapus Order Agunan" onClose={onClose} width="max-w-md">
      <div>
        <p className="text-sm leading-6 text-slate-600">
          Apakah kamu yakin ingin menghapus data order agunan{" "}
          <strong>{order.namaDebitur}</strong>?
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={hapusOrder}
            className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            Hapus
          </button>
        </div>
      </div>
    </Modal>
  );
}
