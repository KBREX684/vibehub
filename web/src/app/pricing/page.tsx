import { SiteHeader } from "@/components/site-header";
import { getSubscriptionPlans, getUserSubscription } from "@/lib/repository";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Check, Sparkles, Zap, Shield } from "lucide-react";

export default async function PricingPage() {
  const session = await getSessionUserFromCookie();
  const [plans, currentSub] = await Promise.all([
    getSubscriptionPlans(),
    session ? getUserSubscription(session.userId) : null,
  ]);

  const activeTier = currentSub?.plan.tier || "free";

  return (
    <>
      <SiteHeader />
      <main className="container pb-24">
        <section className="py-20 md:py-24 flex flex-col items-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-50/80 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>VibeHub Pro</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-3xl leading-[1.1]">
            升级你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">VibeCoding</span> 体验
          </h1>
          
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed">
            解锁高级检索、专属成长面板与更高的 API 调用配额，加速你的项目构建与社区影响力。
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isPro = plan.tier === "pro";
            const isTeam = plan.tier === "team_pro";
            const isActive = activeTier === plan.tier;

            return (
              <div 
                key={plan.id} 
                className={`relative flex flex-col bg-white rounded-3xl p-8 transition-all duration-300 ${
                  isPro 
                    ? "border-2 border-amber-500 shadow-xl md:-translate-y-4" 
                    : "border border-stone-200 shadow-sm hover:shadow-md"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                    最受欢迎
                  </div>
                )}

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-2xl font-bold ${isPro ? "text-amber-600" : "text-stone-900"}`}>
                      {plan.name}
                    </h3>
                    {isPro && <Zap className="w-6 h-6 text-amber-500" />}
                    {isTeam && <Shield className="w-6 h-6 text-blue-500" />}
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-extrabold text-stone-900">
                      ¥{plan.priceMonthly}
                    </span>
                    <span className="text-stone-500 font-medium">/月</span>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed h-10">
                    {plan.description}
                  </p>
                </div>

                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isPro ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-600"
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-stone-700 font-medium text-sm leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-6 border-t border-stone-100">
                  <div className="mb-6 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400 bg-stone-50 px-3 py-1.5 rounded-lg">
                      API 配额: {plan.apiQuota} 次/分钟
                    </span>
                  </div>
                  
                  {isActive ? (
                    <button disabled className="w-full py-3.5 px-4 bg-stone-100 text-stone-500 font-bold rounded-xl cursor-not-allowed">
                      当前计划
                    </button>
                  ) : (
                    <button className={`w-full py-3.5 px-4 font-bold rounded-xl transition-all shadow-sm ${
                      isPro 
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-md hover:-translate-y-0.5" 
                        : "bg-stone-900 text-white hover:bg-stone-800 hover:shadow-md hover:-translate-y-0.5"
                    }`}>
                      {session ? "升级计划" : "登录后升级"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
