import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  School,
  CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { getInitials, roleLabel, roleOptions, roleTone } from "@/pages/admin/users/constants.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PER_PAGE = 10;

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const list = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous > 1) list.push(`ellipsis-${previous}`);
    list.push(page);
    previous = page;
  }
  return list;
}

function SortableHeader({ label, column, sort, order, onSort, className }) {
  const active = sort === column;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
        className={`inline-flex min-h-11 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
          active ? "text-green-700" : "text-green-700/60 hover:text-green-700"
        }`}
      >
        {label}
        {active ? (
          order === "desc" ? (
            <ArrowDown size={12} className="shrink-0" />
          ) : (
            <ArrowUp size={12} className="shrink-0" />
          )
        ) : (
          <ChevronsUpDown size={12} className="shrink-0 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort: "id",
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (role !== "all") params.set("role", role);
      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load users", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, role, debouncedSearch, order]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (refreshTick > 0) loadUsers();
  }, [refreshTick, loadUsers]);

  function onRoleChange(value) {
    setRole(value);
    setPage(1);
  }

  function toggleOrder() {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setRole("all");
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.uuid}`);
      toast.success("User deleted", { description: `${deleteTarget.full_name} was removed.` });
      setDeleteTarget(null);
      if (users.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshTick((tick) => tick + 1);
      }
    } catch (err) {
      toast.error("Delete failed", { description: firstErrorMessage(err) });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(search) || role !== "all";

  return (
    <AdminLayout>
            <PageHeader
        title="User Management"
        subtitle="Manage system accounts, roles, and access."
        icon={ShieldCheck}
        action={
          <Button asChild className="h-11 shrink-0 rounded-xl bg-white px-4 font-semibold text-green-700 shadow-sm hover:bg-green-50">
            <Link to="/admin/users/new">
              <Plus size={16} /> Add User
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email..."
            className="h-11 rounded-xl pl-10 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-48">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" className="h-11 rounded-xl text-gray-500 hover:text-gray-700" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-green-50 hover:bg-green-50">
                  <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">User</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Role</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Institute</TableHead>
                  <SortableHeader label="Email Verified" column="email_verified_at" sort="email_verified_at" order={order} onSort={toggleOrder} />
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="h-64">
                    <Loader2 size={28} className="mx-auto animate-spin text-green-600" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : null}

        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Users size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No users found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">User</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Role</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Institute</TableHead>
                    <SortableHeader label="Email Verified" column="email_verified_at" sort="email_verified_at" order={order} onSort={toggleOrder} />
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.uuid}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-green-700">#{user.id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {user.profile_picture && <AvatarImage src={user.profile_picture} alt={user.full_name} />}
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{user.full_name}</p>
                            <p className="truncate text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${
                            roleTone[user.role] || roleTone.intern
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {roleLabel[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <School size={14} className="text-gray-300" />
                          {user.institute || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.email_verified_at ? (
                          <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                            <CheckCircle2 size={12} /> Verified
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                            Unverified
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${user.full_name}`}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                          >
                            <Link to={`/admin/users/${user.uuid}/edit`}>
                              <Pencil size={16} />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${user.full_name}`}
                            onClick={() => setDeleteTarget(user)}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:text-gray-500"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        )}

        {!loading && meta && meta.total > 0 && (
          <div className="flex items-center justify-center border-t border-gray-100 bg-gray-50/60 px-4 py-4">
            <Pagination className="w-auto">
              <PaginationContent className="justify-center">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {getPageList(page, meta.last_page).map((item) =>
                  typeof item === "number" ? (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < meta.last_page) setPage(page + 1);
                    }}
                    aria-disabled={page >= meta.last_page}
                    className={page >= meta.last_page ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-800">{deleteTarget?.full_name}</span> will be permanently
              removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-xl"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} /> Delete user
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
