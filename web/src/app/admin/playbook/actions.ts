"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    throw new Error("unauthorized");
  }
}

export async function addOutreach(formData: FormData) {
  await requireAdmin();
  const url = String(formData.get("url") ?? "").trim();
  const community = String(formData.get("community") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!url) return;

  await prisma.outreachLog.create({
    data: {
      url,
      community: community || "—",
      note: note || null,
      status: "responded",
    },
  });
  revalidatePath("/admin/playbook");
}

export async function updateOutreachStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  await prisma.outreachLog.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/playbook");
}

export async function deleteOutreach(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.outreachLog.delete({ where: { id } });
  revalidatePath("/admin/playbook");
}

export async function markTargetDone(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.outreachTarget.update({ where: { id }, data: { done: true } });
  revalidatePath("/admin/playbook");
}

export async function clearDoneTargets() {
  await requireAdmin();
  await prisma.outreachTarget.deleteMany({ where: { done: true } });
  revalidatePath("/admin/playbook");
}
