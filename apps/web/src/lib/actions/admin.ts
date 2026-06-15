"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "../../utils/supabase/server";

export async function createDoctor(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const specialty = formData.get("specialty") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    redirect("/dashboard/admin/doctors/new?error=Name%2C+email%2C+and+password+are+required");
  }

  if (password.length < 6) {
    redirect("/dashboard/admin/doctors/new?error=Password+must+be+at+least+6+characters");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/dashboard/admin/doctors/new?error=Unauthorized");

  const admin = createAdminClient();

  const { data: actingDoctor } = await admin
    .from("doctor")
    .select("role")
    .eq("email", user.email)
    .single();
  if (actingDoctor?.role !== "admin") redirect("/dashboard/admin/doctors/new?error=Unauthorized");

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "doctor" },
  });

  if (authError || !authUser.user) {
    redirect(
      `/dashboard/admin/doctors/new?error=${encodeURIComponent(authError?.message ?? "Failed to create user")}`
    );
  }

  const { error: dbError } = await admin.from("doctor").insert({
    id: authUser.user.id,
    email,
    name,
    specialty: specialty || null,
  });

  if (dbError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    redirect(`/dashboard/admin/doctors/new?error=${encodeURIComponent(dbError.message)}`);
  }

  redirect("/dashboard/admin");
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    redirect("/dashboard/settings?error=Both+current+and+new+password+are+required");
  }

  if (newPassword.length < 8) {
    redirect("/dashboard/settings?error=New+password+must+be+at+least+8+characters");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/dashboard/settings?error=Not+authenticated");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    redirect("/dashboard/settings?error=Current+password+is+incorrect");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(updateError.message)}`);
  }

  redirect("/dashboard/settings?success=true");
}
