"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bootstrapAccount } from "@/lib/auth/bootstrapAccount";
import { loginError } from "@/lib/auth/loginError";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const nextPath = useMemo(() => {
    const requested = searchParams.get("next");
    return requested?.startsWith("/") ? requested : "/dashboard";
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = createClient();
      let userId: string | undefined;
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;
        userId = data.user?.id;

        if (!data.session) {
          setMessage("注册成功，请前往邮箱完成验证后登录。");
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        userId = data.user.id;
      }

      if (!userId) {
        throw new Error("无法读取登录用户。");
      }
      await bootstrapAccount(supabase, userId);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const failure = loginError(error);
      setRestricted(failure.restricted);
      setMessage(failure.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
      <label className="flex h-14 items-center gap-3 rounded-[12px] border border-borderSoft bg-white px-4 text-textMuted">
        <UserRound className="size-5" aria-hidden="true" />
        <input
          autoComplete="email"
          className="h-full min-w-0 flex-1 bg-transparent text-body text-textMain outline-none placeholder:text-[var(--color-text-placeholder)]"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="邮箱"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="flex h-14 items-center gap-3 rounded-[12px] border border-borderSoft bg-white px-4 text-textMuted">
        <LockKeyhole className="size-5" aria-hidden="true" />
        <input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-textMain outline-none placeholder:text-[var(--color-text-placeholder)]"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="密码（至少 8 位）"
          required
          type="password"
          value={password}
        />
      </label>

      {message ? (
        <div role="alert" className={`break-words rounded-[10px] border px-3 py-2 text-[12px] leading-5 ${restricted ? "border-warning/30 bg-warning/10 text-textMain" : "border-primary/15 bg-primary-soft text-primary"}`}>
          <p>{message}</p>
          {restricted ? <a href="https://supabase.com/dashboard/project/tkyvafheqyshbjqnzbgq" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-primary underline">打开项目控制台</a> : null}
        </div>
      ) : null}

      <button
        className="flex h-14 items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-white shadow-[0_16px_32px_rgba(11,92,173,0.26)] transition hover:bg-primary-navy disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        {pending ? "处理中" : restricted ? "服务恢复后重试" : mode === "sign-in" ? "安全登录" : "创建账户"}
      </button>

      <button
        className="text-caption text-primary transition hover:text-primary-navy"
        onClick={() => {
          setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
          setMessage(null);
          setRestricted(false);
        }}
        type="button"
      >
        {mode === "sign-in" ? "没有账户？创建账户" : "已有账户？返回登录"}
      </button>
    </form>
  );
}
