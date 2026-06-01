import { Link } from "wouter";
import { Apple, BarChart3, Utensils, Target, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function Landing() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Apple className="w-6 h-6" />
          </div>
          <span className="font-serif text-xl font-medium tracking-tight text-foreground">{t.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{t.landing.signIn}</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">{t.landing.signUp}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
            <Apple className="w-4 h-4" />
            {t.landing.badge}
          </div>

          <h1 className="text-5xl font-serif font-semibold text-foreground leading-tight">
            {t.landing.headline}
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed">
            {t.landing.subheadline}
          </p>

          <div className="flex gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link href="/sign-up">{t.landing.cta}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">{t.landing.signIn}</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto w-full">
          {[
            { icon: Utensils, text: t.landing.feat1 },
            { icon: BarChart3, text: t.landing.feat2 },
            { icon: Target, text: t.landing.feat3 },
            { icon: Sheet, text: t.landing.feat4 },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
              <div className="bg-primary/10 p-3 rounded-xl text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
