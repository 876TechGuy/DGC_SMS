export function NoPermissionState() {
  return (
    <div className="dashboard-state dashboard-state--no-permission" role="alert">
      You do not have permission to view this dashboard. Contact your
      supervisor if you believe this is an error.
    </div>
  );
}
