import Link from "next/link";
import { getTranslations } from "next-intl/server";

import "@/app/[locale]/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import Footer from "@/app/[locale]/(routes)/components/Footer";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const { locale } = params;

  const t = await getTranslations({ locale, namespace: "RootLayout" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gradient-to-b from-background to-muted/30">
      <div className="flex justify-end items-center w-full p-5">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center grow w-full max-w-lg px-4">
        <Link href="/sign-in" className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary font-bold text-primary">
            G
          </div>
          <span className="text-xl font-semibold tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME || "Gexart CRM"}
          </span>
        </Link>
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
