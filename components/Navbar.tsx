import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/upload", label: "Upload" },
  { href: "/reader", label: "Reader" },
  { href: "/chat", label: "Chat" },
];

export default function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold">
          Audiobook AI
        </Link>

        <div className="flex gap-4 text-sm text-zinc-300">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}