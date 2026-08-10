import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { getInitials, roleLabel, roleOptions, roleTone } from "@/pages/admin/users/constants.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
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
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
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
  }, [page, role, debouncedSearch]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system accounts, roles, and access.</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700">
          <Link to="/admin/users/new">
            <Plus size={16} /> Add User
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email…"
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                <TableHead className="font-semibold text-gray-500">User</TableHead>
                <TableHead className="font-semibold text-gray-500">Role</TableHead>
                <TableHead className="hidden font-semibold text-gray-500 md:table-cell">Contact</TableHead>
                <TableHead className="hidden font-semibold text-gray-500 md:table-cell">Joined</TableHead>
                <TableHead className="text-right font-semibold text-gray-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
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
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.uuid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
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
                      <Badge className={`rounded-full font-semibold ring-1 ${roleTone[user.role] || roleTone.intern}`}>
                        {roleLabel[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-gray-600">{user.contact_number || "—"}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${user.full_name}`}
                          className="h-10 w-10 rounded-xl text-gray-500 hover:bg-green-50 hover:text-green-700"
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
                          className="h-10 w-10 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && meta && meta.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">{meta.from ?? 0}</span>–
              <span className="font-semibold text-gray-700">{meta.to ?? 0}</span> of{" "}
              <span className="font-semibold text-gray-700">{meta.total}</span> users
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
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
                  <Loader2 size={16} className="animate-spin" /> Deleting…
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
