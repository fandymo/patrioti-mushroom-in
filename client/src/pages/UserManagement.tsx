import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Shield, ShieldCheck, Link2, Unlink, UserCheck, UserPlus, Mail, Trash2, KeyRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: usersList, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: employeesList } = trpc.employees.list.useQuery({ status: "active" });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("User role updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const linkEmployeeMutation = trpc.users.linkEmployee.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.employees.list.invalidate();
      toast.success("Employee linked successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createUserMutation = trpc.users.createUser.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.employees.list.invalidate();
      toast.success("User created successfully! They can now log in with their email and password.");
      setShowAddDialog(false);
      setNewUser({ name: "", email: "", password: "", role: "user", employeeId: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetPasswordDialog(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.employees.list.invalidate();
      toast.success("User deleted successfully");
      setDeleteDialog(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [linkDialog, setLinkDialog] = useState<{ userId: number; userName: string } | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" as "user" | "admin", employeeId: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ userId: number; userName: string } | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ userId: number; userName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">Only administrators can manage users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLinkedEmployee = (userId: number) => {
    return employeesList?.find((e: any) => e.userId === userId);
  };

  const handleLinkEmployee = () => {
    if (!linkDialog || !selectedEmployeeId) return;
    linkEmployeeMutation.mutate({
      employeeId: parseInt(selectedEmployeeId),
      userId: linkDialog.userId,
    });
    setLinkDialog(null);
    setSelectedEmployeeId("");
  };

  const handleUnlinkEmployee = (employeeId: number) => {
    linkEmployeeMutation.mutate({
      employeeId,
      userId: null,
    });
  };

  const handleCreateUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (newUser.password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    createUserMutation.mutate({
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      password: newUser.password,
      role: newUser.role,
      employeeId: newUser.employeeId ? parseInt(newUser.employeeId) : undefined,
    });
  };

  const handleResetPassword = () => {
    if (!resetPasswordDialog || !newPassword) return;
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    resetPasswordMutation.mutate({
      userId: resetPasswordDialog.userId,
      newPassword,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users, set passwords, and link users to employees</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Users in the system. Use the key icon to reset a user's password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : !usersList?.length ? (
            <div className="text-center py-8 text-muted-foreground">No users found. Click "Add User" to create one.</div>
          ) : (
            <div className="space-y-3">
              {usersList.map((u: any) => {
                const linkedEmp = getLinkedEmployee(u.id);
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <span className="text-sm font-semibold">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{u.name || "Unnamed"}</p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">{u.email || "No email"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.role}
                        onValueChange={(val) => {
                          if (isCurrentUser) {
                            toast.error("You cannot change your own role");
                            return;
                          }
                          updateRoleMutation.mutate({ id: u.id, role: val as "user" | "admin" });
                        }}
                        disabled={isCurrentUser}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="user">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3 w-3" />
                              Worker
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Linked Employee */}
                    <div className="flex items-center gap-2">
                      {linkedEmp ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Link2 className="h-3 w-3" />
                            {linkedEmp.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleUnlinkEmployee(linkedEmp.id)}
                            title="Unlink employee"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => {
                            setLinkDialog({ userId: u.id, userName: u.name || "User" });
                            setSelectedEmployeeId("");
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Link Employee
                        </Button>
                      )}
                    </div>

                    {/* Actions: Reset Password & Delete */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          setResetPasswordDialog({ userId: u.id, userName: u.name || "User" });
                          setNewPassword("");
                        }}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {!isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteDialog({ userId: u.id, userName: u.name || "User" })}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user with email and password. They can sign in immediately after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Full Name *</Label>
              <Input
                id="new-name"
                placeholder="e.g. Ahmad Hassan"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">Email Address *</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="e.g. ahmad@gmail.com"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Password *</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Set a password (min 4 characters)"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Share this password with the user so they can sign in.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(val) => setNewUser(prev => ({ ...prev, role: val as "user" | "admin" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Worker - Can only enter their own harvest data
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Admin - Full access to all features
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Employee (optional)</Label>
              <Select
                value={newUser.employeeId}
                onValueChange={(val) => setNewUser(prev => ({ ...prev, employeeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee to link..." />
                </SelectTrigger>
                <SelectContent>
                  {employeesList
                    ?.filter((e: any) => !e.userId)
                    .map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this user to an employee so they can enter harvest data.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!newUser.name.trim() || !newUser.email.trim() || !newUser.password || newUser.password.length < 4 || createUserMutation.isPending}
              className="gap-2"
            >
              {createUserMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordDialog} onOpenChange={(open) => !open && setResetPasswordDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetPasswordDialog?.userName}</strong>. Share the new password with the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password *</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="Enter new password (min 4 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetPasswordDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 4 || resetPasswordMutation.isPending}
              className="gap-2"
            >
              {resetPasswordMutation.isPending ? (
                <>Resetting...</>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Employee Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={(open) => !open && setLinkDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Employee</DialogTitle>
            <DialogDescription>
              Select an employee to link to <strong>{linkDialog?.userName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employeesList
                  ?.filter((e: any) => !e.userId)
                  .map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleLinkEmployee} disabled={!selectedEmployeeId}>
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog?.userName}</strong>? This action cannot be undone. If this user is linked to an employee, the link will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteMutation.mutate({ id: deleteDialog.userId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
