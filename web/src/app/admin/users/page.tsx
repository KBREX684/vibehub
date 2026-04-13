import Link from "next/link";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listUsers } from "@/lib/repository";

export default async function AdminUsersPage() {
  const session = await getAdminSessionForPage();
  if (!session) {
    return (
      <>
        <main className="container section">
          <article className="card">
            <h1>Admin Access Required</h1>
            <a href="/api/v1/auth/demo-login?role=admin&redirect=/admin/users" className="button ghost">
              Demo login as admin
            </a>
          </article>
        </main>
      </>
    );
  }

  const { items, pagination } = await listUsers({
    page: 1,
    limit: 100,
  });

  return (
    <>
      <main className="container section">
        <h1>User Management</h1>
        <p className="muted">
          Showing {items.length} users (total: {pagination.total})
        </p>
        <p>
          <Link href="/admin" className="inline-link">
            Back to dashboard
          </Link>
        </p>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
