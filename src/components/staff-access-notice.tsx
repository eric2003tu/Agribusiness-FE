import { ShieldAlert } from "lucide-react";

/** The user's role comes from the API (`roles`), but only `superadmin`
 * accounts can write here and there's no reliable way to know that for other
 * roles until a create/update/delete actually fails with 403. This notice
 * sets that expectation up front instead of only surfacing it as an error
 * later. */
export function StaffAccessNotice() {
  return (
    <div className="surface-card mb-6 flex items-start gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        This page writes directly to the live AgriBridge API. Reads work for any signed-in account,
        but create/update/delete actions require a <strong>staff</strong> account on the backend —
        if one fails with a permission error, ask an administrator to grant your account staff
        access.
      </p>
    </div>
  );
}
