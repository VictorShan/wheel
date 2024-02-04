import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <footer className="flex items-center justify-center border-t p-4">
        <a
          className="text-center"
          href="https://github.com/VictorShan/wheel/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Found a bug? Click here to submit an issue on</span>
          <span className="ml-2 underline">GitHub!</span>
        </a>
      </footer>
    </>
  );
}
