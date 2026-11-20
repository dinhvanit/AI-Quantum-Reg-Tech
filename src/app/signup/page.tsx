import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signupWithPassword } from "../login/actions";

const errors: Record<string, string> = {
  invalid: "Vui lòng nhập họ tên và email hợp lệ.",
  password: "Mật khẩu cần có từ 8 đến 72 ký tự.",
  mismatch: "Mật khẩu xác nhận chưa khớp.",
  exists: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
  unavailable: "Chưa thể tạo tài khoản lúc này. Vui lòng thử lại sau.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const session = await auth();
  if (session) redirect("/");
  const params = await searchParams;
  const error = typeof params?.error === "string" ? errors[params.error] : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold text-primary">QuantumRegTech</p>
        <h2 className="mt-2 text-2xl font-bold">Tạo tài khoản</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng ký để bắt đầu sử dụng hệ thống.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form action={signupWithPassword} className="mt-6 space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Họ tên
            <input
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              className="h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              className="h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className="h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Nhập lại mật khẩu
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className="h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tạo tài khoản
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </section>
    </div>
  );
}
