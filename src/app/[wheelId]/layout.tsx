import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <footer className="flex h-12 items-center justify-center border-t">
        <a
          className="flex items-center justify-center"
          href="https://github.com/VictorShan/wheel/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Found a bug? Click here to submit an issue on{" "}
          <span className="ml-2 underline">GitHub</span>!
        </a>
      </footer>
    </>
  );
}
