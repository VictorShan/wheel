import { test, expect } from "@playwright/test";
import { safeUrl } from "~/app/_components/safeUrl";

test("passes through the http(s) links items are allowed to hold", () => {
  expect(safeUrl("https://example.com/lunch")).toBe(
    "https://example.com/lunch",
  );
  expect(safeUrl("http://example.com")).toBe("http://example.com");
});

test("refuses anything that isn't http(s), so it never reaches an href", () => {
  // React renders a javascript: href as a live link - it warns, it does not block.
  expect(safeUrl("javascript:alert(document.cookie)")).toBeUndefined();
  expect(safeUrl("JavaScript:alert(1)")).toBeUndefined();
  expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
  expect(safeUrl("vbscript:msgbox(1)")).toBeUndefined();
  expect(safeUrl("file:///etc/passwd")).toBeUndefined();
});

test("treats junk and absence alike", () => {
  expect(safeUrl("example.com")).toBeUndefined();
  expect(safeUrl("")).toBeUndefined();
  expect(safeUrl(null)).toBeUndefined();
  expect(safeUrl(undefined)).toBeUndefined();
});
