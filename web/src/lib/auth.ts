import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "Compass <auth@polarisia.com.br>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const trialDays = Number(process.env.TRIAL_DAYS ?? 7);
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { trialEndsAt, plan: "trial" },
      });
    },
  },
});
