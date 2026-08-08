import Link from "next/link";
import { version } from "@/package.json";

const Footer = async () => {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Gexart CRM";

  return (
    <footer className="flex h-8 justify-end items-center w-full text-xs text-muted-foreground p-5">
      <Link href="/">
        <span className="hover:text-foreground transition-colors">
          {appName} v{version}
        </span>
      </Link>
    </footer>
  );
};

export default Footer;
