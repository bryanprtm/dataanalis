import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRole, type AppRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { User, Plus, Pencil, Trash2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, deleteUser, listUsers } from "@/lib/users.functions";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

type Row = {
  id: string;
  nama: string | null;
  pangkat: string | null;
  nrp: string | null;
  subden: string | null;
  polda: string | null;
  role: AppRole | null;
  created_at: string | null;
};

const ROLES: AppRole[] = ["super_admin", "admin_sat", "admin_subden", "operator", "viewer"];

const ROLE_VARIANT: Record<AppRole, "cyan" | "amber" | "green" | "outline" | "red"> = {
  super_admin: "red",
  admin_sat: "amber",
  admin_subden: "amber",
  operator: "cyan",
  viewer: "outline",
};

const emptyForm = {
  id: "",
  email: "",
  password: "",
  nama: "",
  pangkat: "",
  nrp: "",
  subden: "",
  polda: "",
  role: "operator" as AppRole,
};

function UsersPage() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const deleteFn = useServerFn(deleteUser);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["users-admin"],
    enabled: !!isSuperAdmin,
    queryFn: () => listFn() as Promise<Row[]>,
  });

  const create = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          email: form.email,
          password: form.password,
          nama: form.nama,
          pangkat: form.pangkat || null,
          nrp: form.nrp || null,
          subden: form.subden || null,
          polda: form.polda || null,
          role: form.role,
        },
      }),
    onSuccess: () => {
      toast.success("User dibuat");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const update = useMutation({
    mutationFn: async () =>
      updateFn({
        data: {
          id: form.id,
          nama: form.nama,
          pangkat: form.pangkat || null,
          nrp: form.nrp || null,
          subden: form.subden || null,
          polda: form.polda || null,
          role: form.role,
        },
      }),
    onSuccess: () => {
      toast.success("User diperbarui");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      id: r.id,
      email: "",
      password: "",
      nama: r.nama ?? "",
      pangkat: r.pangkat ?? "",
      nrp: r.nrp ?? "",
      subden: r.subden ?? "",
      polda: r.polda ?? "",
      role: r.role ?? "operator",
    });
    setOpen(true);
  }

  if (roleLoading) {
    return <div className="font-mono-display text-xs text-muted-foreground">[ LOADING_ROLE... ]</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader code="11" title="Manajemen User" subtitle="Khusus Super Admin" />
        <Panel>
          <div className="flex items-center gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <span>Akses ditolak. Halaman ini hanya untuk role <b>super_admin</b>.</span>
          </div>
        </Panel>
      </div>
    );
  }

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono focus:outline-none focus:border-primary";
  const lbl = "block text-[10px] font-mono-display tracking-wider text-muted-foreground mb-1";

  return (
    <div>
      <PageHeader
        code="11"
        title="Manajemen User"
        subtitle="Tambah, ubah, dan hapus personel TOC Sat Bantek"
        actions={
          <button onClick={openNew} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded">
            <Plus className="w-4 h-4" /> TAMBAH USER
          </button>
        }
      />

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground font-mono-display border-b border-border">
                <th className="py-2 pr-3">NAMA</th>
                <th className="py-2 pr-3">PANGKAT</th>
                <th className="py-2 pr-3">NRP</th>
                <th className="py-2 pr-3">SUBDEN</th>
                <th className="py-2 pr-3">POLDA</th>
                <th className="py-2 pr-3">ROLE</th>
                <th className="py-2 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground font-mono">[ LOADING... ]</td></tr>
              )}
              {data?.map((p) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium">{p.nama ?? "—"}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono">{p.pangkat ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{p.nrp ?? "—"}</td>
                  <td className="py-2 pr-3">{p.subden ?? "—"}</td>
                  <td className="py-2 pr-3">{p.polda ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {p.role ? <Badge variant={ROLE_VARIANT[p.role]}>{p.role}</Badge> : <Badge variant="outline">—</Badge>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                      <Pencil className="w-3 h-3" /> EDIT
                    </button>
                    <button
                      disabled={p.id === user?.id || remove.isPending}
                      onClick={() => {
                        if (confirm(`Hapus user ${p.nama}? Tindakan ini tidak bisa dibatalkan.`)) remove.mutate(p.id);
                      }}
                      className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" /> HAPUS
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground font-mono">[ NO_DATA ]</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="panel p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono-display text-sm tracking-widest text-primary">
                [ {editing ? "EDIT_USER" : "NEW_USER"} ]
              </h2>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editing) update.mutate(); else create.mutate();
              }}
              className="space-y-3"
            >
              {!editing && (
                <>
                  <div>
                    <label className={lbl}>EMAIL</label>
                    <input required type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>PASSWORD (min 8)</label>
                    <input required type="text" minLength={8} className={inp} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <label className={lbl}>NAMA LENGKAP</label>
                <input required className={inp} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>PANGKAT</label>
                  <input className={inp} value={form.pangkat} onChange={(e) => setForm({ ...form, pangkat: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>NRP</label>
                  <input className={inp} value={form.nrp} onChange={(e) => setForm({ ...form, nrp: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>SUBDEN</label>
                  <input className={inp} value={form.subden} onChange={(e) => setForm({ ...form, subden: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>POLDA</label>
                  <input className={inp} value={form.polda} onChange={(e) => setForm({ ...form, polda: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={lbl}>ROLE</label>
                <select className={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-mono-display text-xs tracking-wider rounded disabled:opacity-50"
                >
                  {create.isPending || update.isPending ? "[ PROCESSING... ]" : editing ? "[ SIMPAN ]" : "[ BUAT USER ]"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-border text-xs font-mono-display rounded">
                  BATAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
