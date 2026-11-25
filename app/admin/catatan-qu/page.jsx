"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListTodo,
  Plus,
  Trash2,
  Check,
  CalendarDays,
  CircleCheck,
} from "lucide-react";

const STORAGE_PREFIX = "josjis_catatanqu_";

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStorageKey(dateKey) {
  return `${STORAGE_PREFIX}${dateKey}`;
}

function cleanOldNotes(currentDateKey) {
  try {
    const keysToDelete = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (
        key?.startsWith(STORAGE_PREFIX) &&
        key !== getStorageKey(currentDateKey)
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Gagal membersihkan catatan lama:", error);
  }
}

function readNotes(dateKey) {
  try {
    const saved = localStorage.getItem(getStorageKey(dateKey));
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gagal membaca CatatanQu:", error);
    return [];
  }
}

export default function CatatanQuPage() {
  const [dateKey, setDateKey] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [ready, setReady] = useState(false);

  const refreshForToday = useCallback(() => {
    const today = getLocalDateKey();

    cleanOldNotes(today);
    setDateKey(today);
    setTasks(readNotes(today));
    setReady(true);
  }, []);

  // Memuat catatan saat halaman dibuka.
  useEffect(() => {
    refreshForToday();
  }, [refreshForToday]);

  // Menyimpan catatan setiap ada perubahan.
  useEffect(() => {
    if (!ready || !dateKey) return;

    try {
      localStorage.setItem(getStorageKey(dateKey), JSON.stringify(tasks));
    } catch (error) {
      console.error("Gagal menyimpan CatatanQu:", error);
    }
  }, [tasks, dateKey, ready]);

  // Memeriksa pergantian tanggal, termasuk saat tab kembali aktif.
  useEffect(() => {
    if (!ready) return;

    const checkDate = () => {
      const today = getLocalDateKey();

      if (today !== dateKey) {
        refreshForToday();
      }
    };

    const interval = window.setInterval(checkDate, 30000);
    window.addEventListener("focus", checkDate);
    document.addEventListener("visibilitychange", checkDate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkDate);
      document.removeEventListener("visibilitychange", checkDate);
    };
  }, [dateKey, ready, refreshForToday]);

  const addTask = (event) => {
    event.preventDefault();

    const text = newTask.trim();
    if (!text) return;

    const task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      completed: false,
    };

    setTasks((previous) => [task, ...previous]);
    setNewTask("");
  };

  const toggleTask = (id) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const deleteTask = (id) => {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  };

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  );

  const remainingCount = tasks.length - completedCount;

  const formattedDate = useMemo(() => {
    if (!dateKey) return "";

    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00`));
  }, [dateKey]);

  return (
    <main className="min-h-screen bg-slate-50/70 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Judul */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#174C40]">
            <ListTodo size={18} />
            Catatan harian
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                CatatanQu
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Catat pekerjaan dan selesaikan satu per satu.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
              <CalendarDays size={15} />
              <span>{formattedDate || "Hari ini"}</span>
            </div>
          </div>
        </div>

        {/* Input catatan */}
        <form
          onSubmit={addTask}
          className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <input
            type="text"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Tulis catatan atau pekerjaan..."
            maxLength={200}
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={!newTask.trim()}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#174C40] px-4 text-sm font-semibold text-white transition hover:bg-[#123d34] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </form>

        {/* Ringkasan */}
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">
              {remainingCount}
            </span>{" "}
            belum selesai
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-slate-700">
              {completedCount}
            </span>{" "}
            selesai
          </div>

          {tasks.length > 0 && completedCount === tasks.length && (
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CircleCheck size={15} />
              Semua selesai
            </div>
          )}
        </div>

        {/* Daftar tugas */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!ready ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Memuat catatan...
            </div>
          ) : tasks.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ListTodo size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Belum ada catatan
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tambahkan pekerjaan yang ingin diselesaikan hari ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex min-h-[58px] items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70 sm:px-5"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-label={
                      task.completed ? "Tandai belum selesai" : "Tandai selesai"
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      task.completed
                        ? "border-[#174C40] bg-[#174C40] text-white"
                        : "border-slate-300 bg-white text-transparent hover:border-[#174C40]"
                    }`}
                  >
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>

                  <span
                    className={`min-w-0 flex-1 break-words text-sm leading-6 ${
                      task.completed
                        ? "text-slate-400 line-through"
                        : "text-slate-700"
                    }`}
                  >
                    {task.text}
                  </span>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Hapus catatan"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Keterangan */}
        <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
          Catatan tersimpan di browser ini dan akan dibersihkan otomatis saat
          berganti hari.
        </p>
      </div>
    </main>
  );
}
