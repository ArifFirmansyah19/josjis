import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "request_order_agunan";
const BUNDLE_TABLE = "request_order_agunan_bundel";
const MESSAGE_TABLE = "request_order_agunan_pesan";
const STORAGE_BUCKET = "request-order-agunan-bds";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_REASONS = ["LUNAS", "TOP_UP"];

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function fail(message, status = 400) {
  return json({ success: false, message }, status);
}

function clean(value, maxLength = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}

/**
 * Autentikasi harus melewati Supabase Auth dan sesi aplikasi JOSJIS.
 * Jangan menerima role, pegawai_id, atau unit_id dari browser sebagai
 * sumber kebenaran.
 */
async function getActor() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Cookie sesi dikelola oleh mekanisme autentikasi aplikasi.
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { error: "Silakan login kembali.", status: 401 };
  }

  const appToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!appToken || !(await hasValidAppSession(user.id, appToken))) {
    return {
      error: "Sesi aplikasi tidak valid atau sudah berakhir.",
      status: 401,
    };
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from("pengguna")
    .select("id, auth_user_id, pegawai_id, role, unit_id, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (accountError) {
    console.error("Gagal membaca pengguna:", accountError);
    return {
      error: "Gagal memverifikasi akun.",
      status: 500,
    };
  }

  if (!account || !account.aktif) {
    return {
      error: "Akun tidak aktif atau tidak terdaftar.",
      status: 403,
    };
  }

  const role = String(account.role ?? "").toUpperCase();

  if (!["ADMIN", "MKS"].includes(role)) {
    return {
      error: "Role tidak memiliki akses ke Request Order Agunan.",
      status: 403,
    };
  }

  let employee = null;
  let mks = null;

  if (account.pegawai_id) {
    const { data, error } = await supabaseAdmin
      .from("pegawai")
      .select("id, nama, unit_id, aktif")
      .eq("id", account.pegawai_id)
      .maybeSingle();

    if (error) {
      console.error("Gagal membaca pegawai:", error);
      return { error: "Gagal membaca data pegawai.", status: 500 };
    }

    employee = data;

    if (!employee || !employee.aktif) {
      return {
        error: "Data pegawai tidak aktif atau tidak ditemukan.",
        status: 403,
      };
    }
  }

  if (role === "MKS") {
    if (!employee) {
      return {
        error: "Akun MKS belum terhubung ke data pegawai.",
        status: 403,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("mks")
      .select("id, pegawai_id")
      .eq("pegawai_id", employee.id)
      .maybeSingle();

    if (error) {
      console.error("Gagal membaca data MKS:", error);
      return { error: "Gagal membaca data MKS.", status: 500 };
    }

    if (!data) {
      return {
        error: "Data MKS belum terdaftar.",
        status: 403,
      };
    }

    mks = data;
  }

  return {
    user,
    account,
    role,
    employee,
    mks,
    // Untuk MKS, unit selalu berasal dari data pegawai di server.
    unitId:
      role === "MKS"
        ? employee?.unit_id
        : (account.unit_id ?? employee?.unit_id ?? null),
    nama: employee?.nama || user.user_metadata?.full_name || account.role,
  };
}

function actorError(actor) {
  return actor?.error ? fail(actor.error, actor.status || 403) : null;
}

async function resolveAdminUnit(unitValue) {
  const value = clean(unitValue, 50);

  if (!value) {
    return {
      error: "Pilih unit kerja terlebih dahulu.",
      status: 400,
    };
  }

  let query = supabaseAdmin
    .from("unit")
    .select("id, kode_unit, kode_legacy, nama_unit")
    .eq("status", "AKTIF");

  if (isUuid(value)) {
    query = query.eq("id", value);
  } else {
    query = query.or(`kode_unit.eq.${value},kode_legacy.eq.${value}`);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Gagal menentukan unit:", error);
    return { error: "Gagal memeriksa unit kerja.", status: 500 };
  }

  if (!data) {
    return { error: "Unit kerja tidak ditemukan.", status: 404 };
  }

  return { unit: data };
}

async function resolveUnit(actor, requestedUnit) {
  if (actor.role === "MKS") {
    if (!actor.unitId) {
      return {
        error: "Unit kerja MKS belum diatur.",
        status: 403,
      };
    }

    return resolveAdminUnit(actor.unitId);
  }

  return resolveAdminUnit(requestedUnit);
}

async function signBdsUrl(path) {
  if (!path) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) {
    console.error("Gagal membuat signed URL BDS:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function enrichRows(rows) {
  return Promise.all(
    (rows ?? []).map(async (row) => ({
      ...row,
      bukti_bds_url: await signBdsUrl(row.bukti_bds_path),
    })),
  );
}

async function addMessage({ requestId, unitId, actor, jenis, pesan }) {
  const message = clean(pesan, 1000);

  if (!message) return null;

  const { error } = await supabaseAdmin.from(MESSAGE_TABLE).insert({
    request_id: requestId,
    unit_id: unitId,
    pengirim_user_id: actor.user.id,
    pengirim_pegawai_id: actor.employee?.id ?? null,
    pengirim_nama: clean(actor.nama, 150) || actor.role,
    pengirim_role: actor.role,
    jenis_pesan: jenis,
    pesan: message,
  });

  if (error) {
    console.error("Gagal menyimpan pesan:", error);
    throw new Error("Pesan tidak berhasil disimpan.");
  }
}

async function getRequest(id) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error("Gagal membaca pengajuan.");
  return data;
}

async function getMessages(requestId, unitId) {
  const { data, error } = await supabaseAdmin
    .from(MESSAGE_TABLE)
    .select("*")
    .eq("request_id", requestId)
    .eq("unit_id", unitId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Gagal membaca riwayat pesan.");
  return data ?? [];
}

/**
 * GET
 * /api/request-order-agunan?unit=JKK1
 * /api/request-order-agunan?id=<uuid>&unit=JKK1
 */
export async function GET(request) {
  try {
    const actor = await getActor();
    const denied = actorError(actor);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const unitResult = await resolveUnit(actor, searchParams.get("unit"));

    if (unitResult.error) {
      return fail(unitResult.error, unitResult.status);
    }

    const unit = unitResult.unit;
    const requestId = searchParams.get("id");

    if (requestId) {
      if (!isUuid(requestId)) {
        return fail("ID pengajuan tidak valid.");
      }

      const { data: row, error } = await supabaseAdmin
        .from(TABLE)
        .select("*")
        .eq("id", requestId)
        .eq("unit_id", unit.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error(error);
        return fail("Gagal membaca pengajuan.", 500);
      }

      if (!row) return fail("Pengajuan tidak ditemukan.", 404);

      if (actor.role === "MKS" && row.unit_id !== actor.unitId) {
        return fail("Tidak memiliki akses ke pengajuan ini.", 403);
      }

      const [enriched] = await enrichRows([row]);
      const messages = await getMessages(row.id, unit.id);

      return json({
        success: true,
        unit,
        item: { ...enriched, pesan: messages },
      });
    }

    let query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("unit_id", unit.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const status = searchParams.get("status");
    const bundleId = searchParams.get("bundel_id");

    if (status) {
      query = query.eq("status", clean(status, 40));
    }

    if (bundleId && isUuid(bundleId)) {
      query = query.eq("bundel_id", bundleId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Gagal mengambil daftar pengajuan:", error);
      return fail("Gagal mengambil daftar pengajuan.", 500);
    }

    const [itemsResult, bundleResult] = await Promise.all([
      enrichRows(rows),
      supabaseAdmin
        .from(BUNDLE_TABLE)
        .select("*")
        .eq("unit_id", unit.id)
        .order("tanggal_proses", { ascending: true }),
    ]);

    if (bundleResult.error) {
      console.error(bundleResult.error);
      return fail("Gagal mengambil data bundel.", 500);
    }

    const messagesResult = await supabaseAdmin
      .from(MESSAGE_TABLE)
      .select("*")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    if (messagesResult.error) {
      console.error(messagesResult.error);
      return fail("Gagal mengambil pesan.", 500);
    }

    const messagesByRequest = {};

    for (const message of messagesResult.data ?? []) {
      if (!messagesByRequest[message.request_id]) {
        messagesByRequest[message.request_id] = [];
      }

      messagesByRequest[message.request_id].push(message);
    }

    const items = itemsResult.map((item) => ({
      ...item,
      pesan: messagesByRequest[item.id] ?? [],
    }));

    return json({
      success: true,
      unit,
      items,
      bundles: bundleResult.data ?? [],
    });
  } catch (error) {
    console.error("GET Request Order Agunan:", error);
    return fail(error.message || "Terjadi kesalahan server.", 500);
  }
}

/**
 * POST
 * FormData:
 * action=create
 * unit=JKK1 (hanya Admin; untuk MKS diabaikan)
 * nama_debitur
 * nomor_rekening_pinjaman
 * alasan=LUNAS|TOP_UP
 * nomor_notasi (opsional)
 * agunan (opsional)
 * bukti_bds (file gambar JPEG/PNG/WebP)
 */
export async function POST(request) {
  let uploadedPath = null;

  try {
    const actor = await getActor();
    const denied = actorError(actor);
    if (denied) return denied;

    const form = await request.formData();
    const action = clean(form.get("action"), 30) || "create";

    if (actor.role !== "MKS") {
      return fail("Tindakan ini hanya tersedia untuk MKS.", 403);
    }

    // Mendukung edit pengajuan yang sudah meminta revisi.
    if (action === "update" || action === "edit" || action === "resubmit") {
      const requestId = clean(form.get("id"), 100);

      if (!isUuid(requestId)) {
        return fail("ID pengajuan tidak valid.");
      }

      const unitResult = await resolveUnit(actor, form.get("unit"));

      if (unitResult.error) {
        return fail(unitResult.error, unitResult.status);
      }

      const unit = unitResult.unit;
      const item = await getRequest(requestId);

      if (!item || item.unit_id !== unit.id || item.mks_id !== actor.mks.id) {
        return fail("Pengajuan tidak ditemukan atau bukan milik Anda.", 404);
      }

      if (
        !["MENUNGGU_PEMERIKSAAN", "PERLU_REVISI", "DITOLAK"].includes(
          item.status,
        )
      ) {
        return fail("Pengajuan ini sudah tidak dapat diubah.");
      }

      const namaDebitur = clean(
        form.get("nama_debitur") ?? item.nama_debitur,
        200,
      );

      const nomorRekening = clean(
        form.get("nomor_rekening_pinjaman") ?? item.nomor_rekening_pinjaman,
        100,
      );

      const alasan = clean(form.get("alasan") ?? item.alasan, 20).toUpperCase();

      const nomorNotasi = clean(
        form.get("nomor_notasi") ?? item.nomor_notasi,
        100,
      );

      const agunan = clean(form.get("agunan") ?? item.agunan, 5000);

      if (!namaDebitur || !nomorRekening) {
        return fail("Nama debitur dan nomor rekening wajib diisi.");
      }

      if (!ALLOWED_REASONS.includes(alasan)) {
        return fail("Alasan harus LUNAS atau TOP_UP.");
      }

      const update = {
        nama_debitur: namaDebitur,
        nomor_rekening_pinjaman: nomorRekening,
        alasan,
        nomor_notasi: nomorNotasi || null,
        agunan: agunan || null,
        updated_at: new Date().toISOString(),
      };

      let newPath = null;
      let oldPath = null;

      try {
        const file = form.get("bukti_bds");

        // File bersifat opsional saat edit.
        // Jika tidak ada file baru, bukti lama tetap dipakai.
        if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
          if (file.size > MAX_FILE_SIZE) {
            return fail("Ukuran capture maksimal 2 MB.");
          }

          const allowedMime = ["image/jpeg", "image/png", "image/webp"];

          if (!allowedMime.includes(file.type)) {
            return fail("Bukti BDS harus berupa gambar JPEG, PNG, atau WebP.");
          }

          const extension =
            file.type === "image/png"
              ? "png"
              : file.type === "image/webp"
                ? "webp"
                : "jpg";

          newPath = `${unit.id}/${item.bundel_id}/${crypto.randomUUID()}.${extension}`;

          const bytes = Buffer.from(await file.arrayBuffer());

          const { error: uploadError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(newPath, bytes, {
              contentType: file.type,
              upsert: false,
              cacheControl: "3600",
            });

          if (uploadError) {
            console.error("Upload bukti revisi gagal:", uploadError);
            return fail("Gagal mengunggah bukti BDS baru.", 500);
          }

          oldPath = item.bukti_bds_path;

          update.bukti_bds_path = newPath;
          update.bukti_bds_nama =
            clean(file.name, 255) || `bukti-bds.${extension}`;
          update.bukti_bds_mime = file.type;
          update.bukti_bds_ukuran_bytes = file.size;
        }

        // Pengajuan ulang mengembalikan status ke antrean pemeriksaan.
        if (action === "resubmit") {
          if (!["PERLU_REVISI", "DITOLAK"].includes(item.status)) {
            if (newPath) {
              await supabaseAdmin.storage
                .from(STORAGE_BUCKET)
                .remove([newPath]);
            }

            return fail(
              "Pengajuan ulang hanya tersedia untuk status revisi atau ditolak.",
            );
          }

          update.status = "MENUNGGU_PEMERIKSAAN";
          update.catatan_admin_terakhir = null;
          update.diperiksa_oleh = null;
          update.diperiksa_at = null;
          update.revisi_diminta_at = null;
          update.ditolak_at = null;
          update.versi_pengajuan = Number(item.versi_pengajuan || 1) + 1;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from(TABLE)
          .update(update)
          .eq("id", item.id)
          .eq("unit_id", unit.id)
          .eq("mks_id", actor.mks.id)
          .is("deleted_at", null)
          .select("*")
          .maybeSingle();

        if (updateError || !updated) {
          console.error("Update revisi gagal:", updateError);

          if (newPath) {
            await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([newPath]);
          }

          return fail(
            "Pengajuan gagal diperbarui. Periksa tenggat dan status pengajuan.",
            409,
          );
        }

        // Hapus file lama hanya setelah perubahan database berhasil.
        if (newPath && oldPath) {
          const { error: removeError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .remove([oldPath]);

          if (removeError) {
            console.error("Gagal menghapus bukti BDS lama:", removeError);
          }
        }

        const note = clean(form.get("pesan"), 1000);

        if (action === "resubmit") {
          await addMessage({
            requestId: item.id,
            unitId: unit.id,
            actor,
            jenis: "PENGAJUAN_ULANG",
            pesan: note || "MKS mengirim ulang pengajuan setelah revisi.",
          });
        } else if (note) {
          await addMessage({
            requestId: item.id,
            unitId: unit.id,
            actor,
            jenis: "CATATAN",
            pesan: note,
          });
        }

        const [enriched] = await enrichRows([updated]);

        return json({
          success: true,
          message:
            action === "resubmit"
              ? "Pengajuan berhasil dikirim ulang."
              : "Perubahan pengajuan berhasil disimpan.",
          item: enriched,
        });
      } catch (error) {
        if (newPath) {
          await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([newPath]);
        }

        throw error;
      }
    }

    if (action !== "create") {
      return fail("Action POST tidak dikenal.");
    }

    const unitResult = await resolveUnit(actor, form.get("unit"));
    if (unitResult.error) {
      return fail(unitResult.error, unitResult.status);
    }

    const unit = unitResult.unit;
    const namaDebitur = clean(form.get("nama_debitur"), 200);
    const nomorRekening = clean(form.get("nomor_rekening_pinjaman"), 100);
    const alasan = clean(form.get("alasan"), 20).toUpperCase();
    const nomorNotasi = clean(form.get("nomor_notasi"), 100);
    const agunan = clean(form.get("agunan"), 5000);
    const file = form.get("bukti_bds");

    if (!namaDebitur || !nomorRekening) {
      return fail("Nama debitur dan nomor rekening wajib diisi.");
    }

    if (!ALLOWED_REASONS.includes(alasan)) {
      return fail("Alasan harus LUNAS atau TOP_UP.");
    }

    if (!file || typeof file.arrayBuffer !== "function" || file.size <= 0) {
      return fail("Capture bukti BDS wajib dilampirkan.");
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("Ukuran capture maksimal 2 MB.");
    }

    const allowedMime = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMime.includes(file.type)) {
      return fail("Bukti BDS harus berupa gambar JPEG, PNG, atau WebP.");
    }

    /*
     * Penghitungan jadwal bundel dilakukan oleh database.
     * API tidak menerima bundel_id dari browser.
     *
     * Fungsi SQL harus mengembalikan tanggal proses berikutnya
     * berdasarkan aturan Selasa/Jumat yang sudah dibuat.
     */
    const { data: processDate, error: dateError } = await supabaseAdmin.rpc(
      "request_order_agunan_tanggal_proses",
      { p_waktu: new Date().toISOString() },
    );

    if (dateError || !processDate) {
      console.error("Gagal menentukan jadwal bundel:", dateError);
      return fail("Gagal menentukan jadwal bundel.", 500);
    }

    let { data: bundle, error: bundleError } = await supabaseAdmin
      .from(BUNDLE_TABLE)
      .select("*")
      .eq("unit_id", unit.id)
      .eq("tanggal_proses", processDate)
      .maybeSingle();

    if (bundleError) {
      console.error(bundleError);
      return fail("Gagal memeriksa bundel.", 500);
    }

    if (!bundle) {
      const { data: newBundle, error: createBundleError } = await supabaseAdmin
        .from(BUNDLE_TABLE)
        .insert({
          unit_id: unit.id,
          tanggal_proses: processDate,
          status: "TERBUKA",
        })
        .select("*")
        .single();

      if (createBundleError) {
        /*
         * Jika ada dua MKS membuat bundel bersamaan, salah satu
         * insert bisa gagal karena constraint unik. Coba baca ulang.
         */
        const { data: retryBundle } = await supabaseAdmin
          .from(BUNDLE_TABLE)
          .select("*")
          .eq("unit_id", unit.id)
          .eq("tanggal_proses", processDate)
          .maybeSingle();

        if (!retryBundle) {
          console.error(createBundleError);
          return fail("Gagal membuat bundel pengajuan.", 500);
        }

        bundle = retryBundle;
      } else {
        bundle = newBundle;
      }
    }

    if (bundle.status !== "TERBUKA") {
      return fail("Bundel ini sudah ditutup dan tidak menerima pengajuan.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

    const storagePath = `${unit.id}/${bundle.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload bukti BDS gagal:", uploadError);
      return fail("Gagal mengunggah bukti BDS.", 500);
    }

    uploadedPath = storagePath;

    const { data: item, error: insertError } = await supabaseAdmin
      .from(TABLE)
      .insert({
        unit_id: unit.id,
        bundel_id: bundle.id,
        mks_id: actor.mks.id,
        pemohon_user_id: actor.user.id,
        pemohon_pegawai_id: actor.employee.id,
        pemohon_nama: clean(actor.nama, 150),
        nama_debitur: namaDebitur,
        nomor_rekening_pinjaman: nomorRekening,
        bukti_bds_path: storagePath,
        bukti_bds_nama: clean(file.name, 255) || `bukti-bds.${extension}`,
        bukti_bds_mime: file.type,
        bukti_bds_ukuran_bytes: file.size,
        alasan,
        nomor_notasi: nomorNotasi || null,
        agunan: agunan || null,
        status: "MENUNGGU_PEMERIKSAAN",
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert pengajuan gagal:", insertError);
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);

      return fail("Gagal menyimpan pengajuan.", 500);
    }

    await addMessage({
      requestId: item.id,
      unitId: unit.id,
      actor,
      jenis: "SISTEM",
      pesan: "Pengajuan baru dibuat.",
    });

    const [enriched] = await enrichRows([item]);

    return json(
      {
        success: true,
        message: "Pengajuan berhasil dikirim.",
        item: enriched,
      },
      201,
    );
  } catch (error) {
    console.error("POST Request Order Agunan:", error);

    if (uploadedPath) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
    }

    return fail(error.message || "Terjadi kesalahan server.", 500);
  }
}

/**
 * PATCH
 *
 * MKS:
 * action=edit
 * action=resubmit
 *
 * Admin:
 * action=review
 * keputusan=DITERIMA|PERLU_REVISI|DITOLAK
 * pesan=alasan atau catatan
 *
 * Admin:
 * action=process_bundle
 * action=finish
 *
 * Semua perubahan status dilakukan di server.
 */
export async function PATCH(request) {
  try {
    const actor = await getActor();
    const denied = actorError(actor);
    if (denied) return denied;

    const body = await request.json();
    const action = clean(body.action, 40);
    const requestId = clean(body.id, 100);

    if (!requestId || !isUuid(requestId)) {
      return fail("ID pengajuan tidak valid.");
    }

    const unitResult = await resolveUnit(actor, body.unit);
    if (unitResult.error) {
      return fail(unitResult.error, unitResult.status);
    }

    const unit = unitResult.unit;
    const item = await getRequest(requestId);

    if (!item || item.unit_id !== unit.id) {
      return fail("Pengajuan tidak ditemukan.", 404);
    }

    if (actor.role === "MKS" && item.mks_id !== actor.mks.id) {
      return fail("Tidak memiliki akses ke pengajuan ini.", 403);
    }

    const now = new Date().toISOString();

    if (action === "edit" || action === "resubmit") {
      if (actor.role !== "MKS") {
        return fail("Hanya MKS yang dapat mengubah pengajuan.", 403);
      }

      if (
        !["MENUNGGU_PEMERIKSAAN", "PERLU_REVISI", "DITOLAK"].includes(
          item.status,
        )
      ) {
        return fail("Pengajuan sudah tidak dapat diubah.");
      }

      const update = {};

      for (const field of [
        "nama_debitur",
        "nomor_rekening_pinjaman",
        "agunan",
        "nomor_notasi",
      ]) {
        if (body[field] !== undefined) {
          update[field] =
            field === "agunan"
              ? clean(body[field], 5000) || null
              : clean(body[field], field === "nama_debitur" ? 200 : 100) ||
                null;
        }
      }

      if (body.alasan !== undefined) {
        const reason = clean(body.alasan, 20).toUpperCase();

        if (!ALLOWED_REASONS.includes(reason)) {
          return fail("Alasan harus LUNAS atau TOP_UP.");
        }

        update.alasan = reason;
      }

      if (
        !clean(update.nama_debitur ?? item.nama_debitur, 200) ||
        !clean(
          update.nomor_rekening_pinjaman ?? item.nomor_rekening_pinjaman,
          100,
        )
      ) {
        return fail("Nama debitur dan nomor rekening wajib diisi.");
      }

      if (action === "resubmit") {
        if (!["PERLU_REVISI", "DITOLAK"].includes(item.status)) {
          return fail(
            "Pengajuan ulang hanya untuk pengajuan revisi atau ditolak.",
          );
        }

        update.status = "MENUNGGU_PEMERIKSAAN";
        update.catatan_admin_terakhir = null;
        update.diperiksa_oleh = null;
        update.diperiksa_at = null;
        update.revisi_diminta_at = null;
        update.ditolak_at = null;
        update.versi_pengajuan = Number(item.versi_pengajuan || 1) + 1;
      }

      update.updated_at = now;

      const { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(update)
        .eq("id", item.id)
        .eq("unit_id", unit.id)
        .select("*")
        .single();

      if (error) {
        console.error("Update pengajuan gagal:", error);
        return fail(
          "Pengajuan gagal diperbarui. Periksa apakah sudah melewati batas waktu.",
          409,
        );
      }

      const note = clean(body.pesan, 1000);

      if (action === "resubmit") {
        await addMessage({
          requestId: item.id,
          unitId: unit.id,
          actor,
          jenis: "PENGAJUAN_ULANG",
          pesan: note || "MKS mengirim ulang pengajuan.",
        });
      } else if (note) {
        await addMessage({
          requestId: item.id,
          unitId: unit.id,
          actor,
          jenis: "CATATAN",
          pesan: note,
        });
      }

      const [enriched] = await enrichRows([updated]);

      return json({
        success: true,
        message: "Pengajuan berhasil diperbarui.",
        item: enriched,
      });
    }

    if (actor.role !== "ADMIN") {
      return fail("Tindakan ini hanya dapat dilakukan Admin.", 403);
    }

    if (action === "review") {
      const decision = clean(body.keputusan, 40).toUpperCase();
      const note = clean(body.pesan, 1000);

      if (!["DITERIMA", "PERLU_REVISI", "DITOLAK"].includes(decision)) {
        return fail("Keputusan Admin tidak valid.");
      }

      if (["PERLU_REVISI", "DITOLAK"].includes(decision) && !note) {
        return fail("Pesan wajib diisi untuk revisi atau penolakan.");
      }

      if (item.status !== "MENUNGGU_PEMERIKSAAN") {
        return fail("Pengajuan ini tidak sedang menunggu pemeriksaan.");
      }

      const update = {
        status: decision,
        diperiksa_oleh: actor.user.id,
        diperiksa_at: now,
        updated_at: now,
      };

      if (decision === "DITERIMA") {
        update.diterima_at = now;
        update.catatan_admin_terakhir = note || null;
      }

      if (decision === "PERLU_REVISI") {
        update.revisi_diminta_at = now;
        update.catatan_admin_terakhir = note;
      }

      if (decision === "DITOLAK") {
        update.ditolak_at = now;
        update.catatan_admin_terakhir = note;
      }

      const { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(update)
        .eq("id", item.id)
        .eq("unit_id", unit.id)
        .select("*")
        .single();

      if (error) {
        console.error("Gagal memproses keputusan Admin:", error);
        return fail("Gagal menyimpan keputusan Admin.", 409);
      }

      const messageType = {
        DITERIMA: "DITERIMA",
        PERLU_REVISI: "PERMINTAAN_REVISI",
        DITOLAK: "PENOLAKAN",
      }[decision];

      await addMessage({
        requestId: item.id,
        unitId: unit.id,
        actor,
        jenis: messageType,
        pesan:
          note || (decision === "DITERIMA" ? "Pengajuan diterima Admin." : ""),
      });

      return json({
        success: true,
        message: "Keputusan Admin berhasil disimpan.",
        item: updated,
      });
    }

    if (action === "process_bundle" || action === "finish") {
      const bundleId = clean(body.bundel_id, 100);

      if (!isUuid(bundleId)) {
        return fail("ID bundel tidak valid.");
      }

      const { data: bundle, error: bundleError } = await supabaseAdmin
        .from(BUNDLE_TABLE)
        .select("*")
        .eq("id", bundleId)
        .eq("unit_id", unit.id)
        .maybeSingle();

      if (bundleError || !bundle) {
        return fail("Bundel tidak ditemukan.", 404);
      }

      if (action === "process_bundle") {
        if (!["TERBUKA", "DITUTUP"].includes(bundle.status)) {
          return fail("Bundel ini tidak dapat diproses.");
        }

        const { data: rows, error: rowsError } = await supabaseAdmin
          .from(TABLE)
          .select("id, status")
          .eq("bundel_id", bundleId)
          .eq("unit_id", unit.id)
          .is("deleted_at", null);

        if (rowsError) {
          return fail("Gagal memeriksa isi bundel.", 500);
        }

        const accepted = (rows ?? []).filter(
          (row) => row.status === "DITERIMA",
        );

        if (accepted.length === 0) {
          return fail("Tidak ada pengajuan yang diterima untuk diproses.");
        }

        const ids = accepted.map((row) => row.id);

        const { error: updateRowsError } = await supabaseAdmin
          .from(TABLE)
          .update({
            status: "DIPROSES",
            diproses_at: now,
            updated_at: now,
          })
          .in("id", ids)
          .eq("unit_id", unit.id);

        if (updateRowsError) {
          return fail("Gagal mengubah status pengajuan.", 500);
        }

        const { error: updateBundleError } = await supabaseAdmin
          .from(BUNDLE_TABLE)
          .update({
            status: "DIPROSES",
            ditutup_at: bundle.ditutup_at || now,
            diproses_at: now,
            diperbarui_at: now,
          })
          .eq("id", bundleId)
          .eq("unit_id", unit.id);

        if (updateBundleError) {
          return fail("Gagal memperbarui status bundel.", 500);
        }

        return json({
          success: true,
          message: `${ids.length} pengajuan masuk tahap proses.`,
        });
      }

      if (bundle.status !== "DIPROSES") {
        return fail("Bundel harus berstatus DIPROSES sebelum diselesaikan.");
      }

      const { data: processingRows, error: processingError } =
        await supabaseAdmin
          .from(TABLE)
          .select("id")
          .eq("bundel_id", bundleId)
          .eq("unit_id", unit.id)
          .eq("status", "DIPROSES")
          .is("deleted_at", null);

      if (processingError) {
        return fail("Gagal memeriksa pengajuan yang diproses.", 500);
      }

      const ids = (processingRows ?? []).map((row) => row.id);

      if (ids.length) {
        const { error: finishRowsError } = await supabaseAdmin
          .from(TABLE)
          .update({
            status: "SELESAI",
            selesai_at: now,
            updated_at: now,
          })
          .in("id", ids)
          .eq("unit_id", unit.id);

        if (finishRowsError) {
          return fail("Gagal menyelesaikan pengajuan.", 500);
        }
      }

      const { error: finishBundleError } = await supabaseAdmin
        .from(BUNDLE_TABLE)
        .update({
          status: "SELESAI",
          diperbarui_at: now,
        })
        .eq("id", bundleId)
        .eq("unit_id", unit.id);

      if (finishBundleError) {
        return fail("Gagal menyelesaikan bundel.", 500);
      }

      return json({
        success: true,
        message: "Bundel berhasil diselesaikan.",
      });
    }

    if (action === "message") {
      const note = clean(body.pesan, 1000);

      if (!note) return fail("Pesan tidak boleh kosong.");

      await addMessage({
        requestId: item.id,
        unitId: unit.id,
        actor,
        jenis: "CATATAN",
        pesan: note,
      });

      return json({
        success: true,
        message: "Pesan berhasil dikirim.",
      });
    }

    return fail("Action PATCH tidak dikenal.");
  } catch (error) {
    console.error("PATCH Request Order Agunan:", error);
    return fail(error.message || "Terjadi kesalahan server.", 500);
  }
}

/**
 * DELETE
 * Soft delete; pengajuan tidak dihapus permanen dari database.
 */
export async function DELETE(request) {
  try {
    const actor = await getActor();
    const denied = actorError(actor);
    if (denied) return denied;

    if (actor.role !== "MKS") {
      return fail("Hanya MKS yang dapat menghapus pengajuan.", 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isUuid(id)) return fail("ID pengajuan tidak valid.");

    const unitResult = await resolveUnit(actor, searchParams.get("unit"));

    if (unitResult.error) {
      return fail(unitResult.error, unitResult.status);
    }

    const item = await getRequest(id);

    if (
      !item ||
      item.unit_id !== unitResult.unit.id ||
      item.mks_id !== actor.mks.id
    ) {
      return fail("Pengajuan tidak ditemukan.", 404);
    }

    if (
      !["MENUNGGU_PEMERIKSAAN", "PERLU_REVISI", "DITOLAK"].includes(item.status)
    ) {
      return fail("Pengajuan ini sudah tidak dapat dihapus.");
    }

    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: actor.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("unit_id", unitResult.unit.id)
      .eq("mks_id", actor.mks.id)
      .is("deleted_at", null);

    if (error) {
      console.error("Soft delete gagal:", error);
      return fail(
        "Pengajuan gagal dihapus. Periksa batas waktu pengajuan.",
        409,
      );
    }

    return json({
      success: true,
      message: "Pengajuan dihapus dari daftar aktif.",
    });
  } catch (error) {
    console.error("DELETE Request Order Agunan:", error);
    return fail(error.message || "Terjadi kesalahan server.", 500);
  }
}
