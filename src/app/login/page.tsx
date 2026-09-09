import Image from "next/image";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import loginBackground from "../../../assets/backgrounds/login_water_plant_ai_bg.png";
import logoMark from "../../../assets/svg-icons/logo_water_price_system.svg";
import { LoginForm } from "@/components/auth/LoginForm";

const featureCards = [
  { title: "机电设备价格库", description: "覆盖水厂机电设备全品类价格信息" },
  { title: "地材价格库", description: "区域地材价格数据与趋势分析" },
  { title: "AI 报价识别", description: "从报价文件提取结构化价格和风险字段" },
  { title: "询价比价管理", description: "多维对比供应商报价与技术偏差" },
  { title: "项目套价中心", description: "基于可信价格依据形成项目测算" },
  { title: "价格证据链", description: "价格来源、审核和附件证据全程可追溯" },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-primary-deep text-white">
      <Image
        src={loginBackground}
        alt="水厂工程 AI 价格系统背景"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/92 via-primary-deep/70 to-primary-deep/35" />

      <div className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-20">
        <section className="max-w-4xl">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-[20px] bg-white shadow-[0_16px_40px_rgba(0,166,184,0.28)]">
              <Image src={logoMark} alt="水厂价格信息库 Logo" width={46} height={46} />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-8">水厂项目机电设备与地材价格信息库</p>
              <p className="mt-1 text-sm text-cyan-100/80">AI Price Intelligence</p>
            </div>
          </div>

          <div className="mt-12">
            <h1 className="max-w-4xl text-[44px] font-semibold leading-tight tracking-0 lg:text-[56px]">
              水厂工程价格情报与 AI 套价决策中心
            </h1>
            <p className="mt-6 max-w-3xl text-[18px] leading-8 text-blue-50/86">
              面向投标组价、供应商询价、成本测算与价格依据管理。AI 负责识别、采集与建议，
              最终商务判断始终进入人工复核流程。
            </p>
          </div>

          <div className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((item) => (
              <div
                key={item.title}
                className="rounded-card border border-white/12 bg-white/[0.08] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-md"
              >
                <p className="text-[15px] font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-[12px] leading-5 text-cyan-50/72">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[520px] rounded-[24px] border border-white/60 bg-white/92 p-8 text-textMain shadow-[0_28px_80px_rgba(6,27,58,0.34)] backdrop-blur-xl lg:p-10">
          <div className="text-center">
            <h2 className="text-[30px] font-semibold text-primary-deep">用户登录</h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-pill bg-primary" />
            <p className="mt-4 text-body text-textMuted">使用 Supabase Auth 安全访问业务数据。</p>
          </div>

          <Suspense
            fallback={
              <div className="mt-8 h-[252px] animate-pulse rounded-[12px] bg-[var(--color-bg-muted)]" />
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-8 flex items-center gap-3 text-caption text-textMuted">
            <div className="h-px flex-1 bg-borderSoft" />
            <span>安全模式</span>
            <div className="h-px flex-1 bg-borderSoft" />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-pill border border-borderSoft bg-white text-primary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <p className="text-caption text-textMuted">
              数据按工作组隔离，AI 输出必须经过人工复核。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
